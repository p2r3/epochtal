const UtilError = require("./error.js");

const { $ } = require("bun");
const fs = require("node:fs");
const tmppath = require("./tmppath.js");
const testcvar = require("./testcvar.js");

/**
 * Extends the demo file path if it is not already an absolute path.
 * Allows specifying just the filename of the demo as a shorthand for the full path
 *
 * @param {string} file The file path to extend
 * @returns {string} The extended file path
 */
function extendFilePath (file) {
  if (!fs.existsSync(file)) {
    return `${gconfig.datadir}/week/proof/${file}`;
  }
  return file;
}

/**
 * Decompresses an XZ-compressed file
 *
 * @param {string} file File to decompress
 * @returns {string} The decompressed file path
 */
async function decompressXZ (file) {

  await $`xz -dkf ${file}`.quiet();
  return file.slice(0, -3);

}

/**
 * Parses a demo file with UntitledParser and returns the steamid and partner steamid
 *
 * @param {string} file Path to the file to parse
 * @returns {object} Object containing the steamid and partner steamid
 */
async function parseDump (file) {

  // Make sure file is decompressed
  const originalFile = file;
  if (file.endsWith(".dem.xz")) file = await decompressXZ(file);

  // Parse the demo into tmp path and read the dump
  const outputPath = await tmppath();
  fs.mkdirSync(outputPath);

  await $`${`${gconfig.bindir}/UntitledParser`} -o ${outputPath} -D ${file}`.quiet();
  const outputFile = (fs.readdirSync(outputPath))[0];
  const dump = await Bun.file(`${outputPath}/${outputFile}`).text();

  fs.rmSync(outputPath, { recursive: true });
  if (originalFile !== file) fs.unlinkSync(file);

  const output = {};

  // i dont really wanna do this yet

  // Parse the steamid from the dump
  const steamidSplit = dump.split("GUID: STEAM_1:");

  const parts = steamidSplit[1].split("\n")[0].split(":");
  output.steamid = (76561197960265728n + BigInt(parts[0]) + BigInt(parts[1]) * 2n).toString();

  // Parse the partners steam id from the dump
  if (steamidSplit.length > 2) {
    let partner = output.steamid;
    let i = 2;
    // Skip steamids until we find one that is not the same as the main steamid
    while (partner === output.steamid && i < steamidSplit.length) {
      const currParts = steamidSplit[i++].split("\n")[0].split(":");
      partner = (76561197960265728n + BigInt(currParts[0]) + BigInt(currParts[1]) * 2n).toString();
    }
    if (partner !== output.steamid) {
      output.partner = partner;
    }
  }

  return output;

}

/**
 * Parses a demo file with mluggs demo parser
 *
 * @param {string} file Path to the file to parse
 * @returns {object} Parsed demo data
 */
async function parseMDP (file, context) {

  // Make sure file is decompressed
  const originalFile = file;
  if (file.endsWith(".dem.xz")) file = await decompressXZ(file);

  // Get SAR and file checksum list paths from context
  const { filesums, sarsums } = context.file.mdp;

  // Parse the demo into json
  const stdout = await $`cd "${gconfig.bindir}/mdp-json" && ./mdp "${file}" --filesum-path "${filesums}" --sarsum-path "${sarsums}"`.text();
  const json = JSON.parse(stdout.replaceAll("\\", "\\\\"));
  if (originalFile !== file) fs.unlinkSync(file);

  return json;

}

/**
 * Demo verification verdicts.
 * VERDICT_SAFE: No signs of potential cheating
 * VERDICT_ILLEGAL: Clear illegal utilities used
 * VERDICT_UNSURE: No certain verdict
 */
const [VERDICT_SAFE, VERDICT_UNSURE, VERDICT_ILLEGAL] = [0, 1, 2];
// Demo expiry time in milliseconds
const EXPIRY_TIME = 1000 * 60 * 60;

/**
 * Handles the `demo` utility call. This utility is used to parse and verify demo files.
 *
 * The following subcommands are available:
 * - `dump`: Dump steamid and partner steamid from the demo file
 * - `mdp`: Parse a demo file with mluggs demo parser
 * - `parse`: Fully parse a demo file and extract time and portal count
 * - `verify`: Verify a demo file for cheating
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, file] = args;

  switch (command) {

    case "dump": {

      // Extend demo file path if it is not already an absolute path
      const path = extendFilePath(file);
      if (!fs.existsSync(path)) throw new UtilError("ERR_FILE", args, context);

      // Parse the demo file
      return await parseDump(path);

    }

    case "mdp": {

      // Extend demo file path if it is not already an absolute path
      const path = extendFilePath(file);
      if (!fs.existsSync(path)) throw new UtilError("ERR_FILE", args, context);

      // Parse the demo file using mdp
      return await parseMDP(path, context);

    }

    case "parse": {

      // If set, counts uses of a console command instead of portals fired
      const portalOverride = args[2];

      // Extend demo file path if it is not already an absolute path
      const path = extendFilePath(file);
      if (!fs.existsSync(path)) throw new UtilError("ERR_FILE", args, context);

      // Fully parse the demo file
      const mdp = await parseMDP(path, context);
      const dump = await parseDump(path);

      // Extract the time and portal count from the demo
      const output = {
        ...dump,
        time: mdp.demos[0].ticks,
        timer: false,
        portals: 0
      };

      // Filter through demo events to find the time and portal count
      for (const event of mdp.demos[0].events) {

        if (event.type === "speedrun") {
          output.time = event.value.total.ticks;
          output.timer = true;
          continue;
        }

        if (portalOverride) {
          if (event.type === "cmd" && event.value.split(" ")[0].toLowerCase() === portalOverride) {
            output.portals ++;
          }
        } else {
          if (event.type === "portal") {
            output.portals ++;
          }
        }


      }

      // Fail if the time or steamid is missing
      if (!output.time || !output.steamid) throw new UtilError("ERR_PARSE", args, context);

      return output;

    }

    case "verify": {

      // Extend demo file path if it is not already an absolute path
      const path = extendFilePath(file);
      if (!fs.existsSync(path)) throw new UtilError("ERR_FILE", args, context);

      // Parse the demo file using mdp
      const mdp = await parseMDP(path, context);

      // Ensure tickrate is correct
      if (Math.abs(mdp.demos[0].tps - 60.00) > 0.01) {
        return `Tickrate mismatch. Expected 60.00, got ${mdp.tps.toFixed(2)}.`;
      }

      let ppnf = false, sv_cheats = false;
      let lastTimestamp = null, speedrunTimer = null;
      const timestampNow = Date.now();

      for (const event of mdp.demos[0].events) {
        switch (event.type) {

          // Ensure demo is submitted within the expiry time
          case "timestamp": {

            if (timestampNow - Date.parse(event.value) > EXPIRY_TIME) {
              return `Demo was recorded more than 1h ago, according to system clock.`;
            }
            break;

          }

          // Ensure all significant files passed the validation check
          case "file": {

            const path = event.value.path.toLowerCase();
            if (
              path.includes("/common/portal 2/portal2_tempcontent/") ||
              path.includes("/common/portal 2/update/")
            ) {
              return `Significant file \`${event.value.path}\` has mismatched checksum \`${event.value.sum}\`.`;
            }
            break;

          }

          // Ensure no sar or demo mismatches are present
          case "sarsum": return `SAR checksum mismatch, got \`${event.value}\`.`;
          case "demosum": return `Demo checksum mismatch.`;

          // Handle console commands and cvars
          case "cvar":
          case "cmd": {

            const cvar = (event.type === "cvar" ? event.val.cvar : event.value.split(" ")[0]).trim().toLowerCase();
            const value = event.type === "cvar" ? event.val.val : event.value.split(" ").slice(1).join(" ");

            // Ensure the demo is on the correct map
            if (cvar === "host_map") {
              const expected = context.data.week.map.file + ".bsp";
              if (value !== expected) {
                return `Host map path incorrect. Expected \`${expected}\`, got \`${event.val.val}\`.`;
              }
            }

            // Check for server clock timestamps
            if (cvar === "-alt1" && value.startsWith("ServerTimestamp")) {
              const timestamp = parseInt(value.slice(16));
              if (timestamp) lastTimestamp = timestamp;
            }

            // Keep track of the value of sv_cheats
            if (cvar === "sv_cheats") {
              if (!value || value == "0") sv_cheats = false;
              else sv_cheats = true;
            }

            // Ensure the demo is not using illegal commands
            const verdict = await testcvar([cvar, value, sv_cheats], context);

            if (verdict === VERDICT_ILLEGAL) {
              if (cvar.trim().toLowerCase() === "sv_portal_placement_never_fail") {
                ppnf = true;
                break;
              }
              return `Illegal command: \`${cvar}${value !== "" ? " " + value : ""}\``;
            }

            break;

          }

          // Look for speedrun timer output
          case "speedrun": {
            speedrunTimer = event.value.total.ticks;
            break;
          }

        }
      }

      if (lastTimestamp === null) return "Server timestamp not found.";
      if (speedrunTimer === null) return "Speedrun timer not stopped.";

      if (timestampNow - lastTimestamp > EXPIRY_TIME) {
        return `Demo was recorded more than 1h ago, according to server clock.`;
      }
      if (lastTimestamp > timestampNow) {
        return `Demo was recorded in the future, server timestamp is \`${lastTimestamp}\`.`;
      }

      if (ppnf) return "PPNF";
      return "VALID";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
