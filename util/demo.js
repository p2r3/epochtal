const UtilError = require("./error.js");

const { $ } = require("bun");
const fs = require("node:fs");
const tmppath = require("./tmppath.js");
const discord = require("./discord.js");
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
    return `${__dirname}/../demos/${file}`;
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

  await $`${`${__dirname}/../bin/UntitledParser`} -o ${outputPath} -D ${file}`.quiet();
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
async function parseMDP (file) {

  // Make sure file is decompressed
  const originalFile = file;
  if (file.endsWith(".dem.xz")) file = await decompressXZ(file);

  // Parse the demo into json
  const text = (await $`cd ${`${__dirname}/../bin/mdp-json`} && ./mdp ${file}`.text()).replaceAll("\\", "\\\\");
  const output = JSON.parse(text);
  if (originalFile !== file) fs.unlinkSync(file);

  return output;

}

/**
 * Demo verification verdicts.
 * VERDICT_SAFE: No signs of potential cheating
 * VERDICT_ILLEGAL: Clear illegal utilities used
 * VERDICT_UNSURE: No certain verdict
 */
const [VERDICT_SAFE, VERDICT_UNSURE, VERDICT_ILLEGAL] = [0, 1, 2];

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
      return await parseMDP(path);

    }

    case "parse": {

      // Extend demo file path if it is not already an absolute path
      const path = extendFilePath(file);
      if (!fs.existsSync(path)) throw new UtilError("ERR_FILE", args, context);

      // Fully parse the demo file
      const mdp = await parseMDP(path);
      const dump = await parseDump(path);

      // Extract the time and portal count from the demo
      const output = {
        ...dump,
        time: null,
        portals: 0
      };

      // Filter through demo events to find the time and portal count
      for (const event of mdp.demos[0].events) {

        if (event.type === "speedrun") {
          output.time = event.value.total.ticks;
          continue;
        }

        if (event.type === "portal") {
          output.portals ++;
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
      const mdp = await parseMDP(path);

      // Ensure tickrate is correct
      if (Math.abs(mdp.demos[0].tps - 60.00) > 0.01) {
        return `Tickrate mismatch. Expected 60.00, got ${mdp.tps.toFixed(2)}.`;
      }

      let ppnf = false, sv_cheats = false;
      let timescale = [], timescaleTotal = 0;

      for (const event of mdp.demos[0].events) {

        // Ensure demo is submitted within 1 hour
        if (event.type === "timestamp") {
          if (Date.now() - Date.parse(event.value) > 1000 * 60 * 60) {
            return `Demo was recorded more than 1h ago.`;
          }
          continue;
        }

        // Ensure all significant files passed the validation check
        if (event.type === "file") {
          const path = event.value.path.toLowerCase();
          if (
            path.includes("/common/portal 2/portal2_tempcontent/") ||
            path.includes("/common/portal 2/update/")
          ) {
            return `Significant file \`${event.value.path}\` has mismatched checksum \`${event.value.sum}\`.`;
          }
          continue;
        }

        // Ensure no sar or demo mismatches are present
        if (event.type === "sarsum") {
          return `SAR checksum mismatch, got \`${event.value}\`.`;
        }
        if (event.type === "demosum") {
          return `Demo checksum mismatch.`;
        }

        // Ensure the demo is on the correct map
        if (event.type === "cvar") {
          if (event.val.cvar === "host_map") {
            const expected = context.data.week.map.file + ".bsp";
            if (event.val.val !== expected) {
              return `Host map path incorrect. Expected \`${expected}\`, got \`${event.val.val}\`.`;
            }
          }
        }

        // Ensure the demo is not using illegal commands
        if (event.type === "cvar" || event.type === "cmd") {

          const cvar = (event.type === "cvar" ? event.val.cvar : event.value.split(" ")[0]).trim().toLowerCase();
          const value = event.type === "cvar" ? event.val.val : event.value.split(" ").slice(1).join(" ");

          if (cvar === "sv_cheats") {
            if (!value || value == "0") sv_cheats = false;
            else sv_cheats = true;
          }

          const verdict = await testcvar([cvar, value, sv_cheats], context);

          if (verdict === VERDICT_ILLEGAL) {
            if (cvar.trim().toLowerCase() === "sv_portal_placement_never_fail") {
              ppnf = true;
              continue;
            }
            return `Illegal command: \`${cvar}${value !== "" ? " " + value : ""}\``;
          }

        }

      }

      if (ppnf) return "PPNF";
      return "VALID";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
