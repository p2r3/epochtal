const UtilError = require("./error.js");

const { $ } = require("bun");
const fs = require("node:fs");
const tmppath = require("./tmppath.js");
const discord = require("./discord.js");

async function parseDump (file) {

  const outputPath = await tmppath();
  fs.mkdirSync(outputPath);

  await $`${`${__dirname}/../bin/UntitledParser`} -o ${outputPath} -D ${file}`.quiet();
  const outputFile = (fs.readdirSync(outputPath))[0];
  const dump = await Bun.file(`${outputPath}/${outputFile}`).text();

  fs.rmSync(outputPath, { recursive: true });

  // i dont really wanna do this yet

  const parts = dump.split("GUID: STEAM_1:")[1].split("\n")[0].split(":");
  const steamid = (76561197960265728n + BigInt(parts[0]) + BigInt(parts[1]) * 2n).toString();

  return { steamid };

}

async function parseMDP (file) {

  return JSON.parse(await $`cd ${`${__dirname}/../bin/mdp-json`} && ./mdp ${file}`.text());

}

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
            path.startsWith("./portal2_tempcontent/") ||
            path.startsWith("./update/")/* ||
            path.endsWith("/sp_transition_list.nut") ||
            path.endsWith("/scripts/vscripts/debug_scripts/noclip_door_open_sensor.nut")*/
          ) {
            return `Crucial file \`${event.value.path}\` has mismatched checksum \`${event.value.sum}\`.`;
          }
          continue;
        }

        if (event.type === "sarsum") {
          return `SAR checksum mismatch, got \`${event.value}\`.`;
        }
        if (event.type === "demosum") {
          return `Demo checksum mismatch.`;
        }

      }
      
      if (Math.abs(mdp.tps - 60.00) > 0.01) return `Tickrate mismatch. Expected 60.00, got ${mdp.tps.toFixed(2)}.`;

      return "VALID";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
