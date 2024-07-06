const UtilError = require("./error.js");

const { $ } = require("bun");
const fs = require("node:fs");
const tmppath = require("./tmppath.js");
const discord = require("./discord.js");
const testcvar = require("./testcvar.js");

async function decompressXZ (file) {

  await $`xz -dkf ${file}`.quiet();
  return file.slice(0, -3);

}

async function parseDump (file) {

  const originalFile = file;
  if (file.endsWith(".dem.xz")) file = await decompressXZ(file);

  const outputPath = await tmppath();
  fs.mkdirSync(outputPath);

  await $`${`${__dirname}/../bin/UntitledParser`} -o ${outputPath} -D ${file}`.quiet();
  const outputFile = (fs.readdirSync(outputPath))[0];
  const dump = await Bun.file(`${outputPath}/${outputFile}`).text();

  fs.rmSync(outputPath, { recursive: true });
  if (originalFile !== file) fs.unlinkSync(file);

  const output = {};

  // i dont really wanna do this yet

  const steamidSplit = dump.split("GUID: STEAM_1:");

  const parts = steamidSplit[1].split("\n")[0].split(":");
  output.steamid = (76561197960265728n + BigInt(parts[0]) + BigInt(parts[1]) * 2n).toString();

  if (steamidSplit.length > 2) {
    let partner = output.steamid;
    let i = 2;
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

async function parseMDP (file) {

  const originalFile = file;
  if (file.endsWith(".dem.xz")) file = await decompressXZ(file);

  const text = (await $`cd ${`${__dirname}/../bin/mdp-json`} && ./mdp ${file}`.text()).replaceAll("\\", "\\\\");
  const output = JSON.parse(text);
  if (originalFile !== file) fs.unlinkSync(file);

  return output;

}

const [VERDICT_SAFE, VERDICT_UNSURE, VERDICT_ILLEGAL] = [0, 1, 2];

module.exports = async function (args, context = epochtal) {

  const [command, file] = args;

  switch (command) {
    
    case "dump": {

      return await parseDump(file);
    
    }
  
    case "mdp": {

      return await parseMDP(file);

    }

    case "parse": {

      const mdp = await parseMDP(file);
      const dump = await parseDump(file);

      const output = {
        steamid: dump.steamid,
        time: null,
        portals: 0
      }

      for (const event of mdp.demos[0].events) {
      
        if (event.type === "speedrun") {
          output.time = event.value.total.ticks;
          continue;
        }

        if (event.type === "portal") {
          output.portals ++;
        }

      }
      
      if (!output.time || !output.steamid) throw new UtilError("ERR_PARSE", args, context);

      return output;

    }

    case "verify": {

      const mdp = await parseMDP(file);

      if (Math.abs(mdp.demos[0].tps - 60.00) > 0.01) {
        return `Tickrate mismatch. Expected 60.00, got ${mdp.tps.toFixed(2)}.`;
      }

      let ppnf = false;
      let timescale = [], timescaleTotal = 0;

      for (const event of mdp.demos[0].events) {

        if (event.type === "timestamp") {
          if (Date.now() - Date.parse(event.value) > 1000 * 60 * 60 * 24) {
            return `Demo was recorded more than 24h ago.`;
          }
          continue;
        }

        if (event.type === "file") {
          const path = event.value.path;
          if (
            path.includes("/common/Portal 2/portal2_tempcontent/") ||
            path.includes("/common/Portal 2/update/")
          ) {
            return `Significant file \`${event.value.path}\` has mismatched checksum \`${event.value.sum}\`.`;
          }
          continue;
        }

        if (event.type === "sarsum") {
          return `SAR checksum mismatch, got \`${event.value}\`.`;
        }
        if (event.type === "demosum") {
          return `Demo checksum mismatch.`;
        }

        if (event.type === "cvar") {
          if (event.val.cvar === "host_map") {
            const expected = context.data.week.map.file + ".bsp";
            if (event.val.val !== expected) {
              return `Host map path incorrect. Expected \`${expected}\`, got \`${event.val.val}\`.`;
            }
          }
        }

        if (event.type === "cvar" || event.type === "cmd") {

          const cvar = event.type === "cvar" ? event.val.cvar : event.value.split(" ")[0];
          const value = event.type === "cvar" ? event.val.val : event.value.split(" ").slice(1).join(" ");
        
          const verdict = await testcvar([cvar, value], context);
          
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
