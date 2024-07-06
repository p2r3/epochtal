const UtilError = require("./error.js");

const fs = require("node:fs");
const { $ } = require("bun");

const keys = require("../../keys.js");
const archive = require("./archive.js");
const weeklog = require("./weeklog.js");
const points = require("./points.js");
const profiledata = require("./profiledata.js");

function decodeLog (buffer, categoryList) {

  const log = [];

  // each entry is 10 bytes long
  for (let i = 0; i < buffer.length; i += 10) {

    const entry = {};
    
    // 1 byte - category index
    entry.category = categoryList[buffer[i]];

    // 4 bytes - run time in ticks
    entry.time = 0;
    for (let j = 0; j < 4; j ++) {
      entry.time += buffer[i + 1 + j] * Math.pow(256, 3 - j);
    }

    // 1 byte - portal count
    entry.portals = buffer[i + 5];

    // 4 bytes - seconds since start of week 0
    entry.timestamp = 0;
    for (let j = 0; j < 4; j ++) {
      entry.timestamp += buffer[i + 6 + j] * Math.pow(256, 3 - j);
    }

    log.push(entry);
    
  }

  return log;

}

function encodeLog (log, categoryList) {

  const buffer = new Uint8Array(10 * log.length);

  for (let j = 0; j < log.length; j ++) {
    
    const offset = j * 10;
    const entry = log[j];

    buffer[offset] = categoryList.indexOf(entry.category);
  
    for (let i = 0; i < 4; i ++) {
      buffer[offset + 1 + i] = entry.time % (256 ** (4 - i)) / (256 ** (3 - i));
    }
  
    buffer[offset + 5] = Math.min(entry.portals, 255);
    
    for (let i = 0; i < 4; i ++) {
      buffer[offset + 6 + i] = entry.timestamp % (256 ** (4 - i)) / (256 ** (3 - i));
    }
  
  }
  
  return buffer;

}

module.exports = async function (args, context = epochtal) {
  
  const [command, steamid] = args;

  switch (command) {
    
    case "build": {

      const archives = await archive(["list"], context);
      const profileLog = [];

      for (let i = archives.length - 1; i >= 0; i --) {

        const archiveContext = await archive(["get", archives[i]], context);
        const logData = await weeklog(["read"], archiveContext);

        const times = {};

        for (let j = 0; j < logData.length; j ++) {

          const run = logData[j];

          if (run.steamid !== steamid) {

            if (!(run.category in times)) {
              times[run.category] = {};
            }
            times[run.category][run.steamid] = run.time;
            
            continue;
          }

          let placement = 0;
          for (const curr in times[run.category]) {
            if (times[run.category][curr] < run.time) placement ++;
          }
          logData[j].placement = placement;

          const timestamp = logData[j].timestamp + 604800 * (archiveContext.data.week.number - 1);
          logData[j].timestamp = Math.floor(timestamp);

          profileLog.push(logData[j]);

        }

      }

      const categoryList = [];
      for (let i = 0; i < profileLog.length; i ++) {
        if (!categoryList.includes(profileLog[i].category)) {
          categoryList.push(profileLog[i].category);
        }
      }
      await profiledata(["edit", steamid, "categories", categoryList], context);

      const logBuffer = encodeLog(profileLog, categoryList);

      const profilePath = `${context.file.profiles}/${steamid}`;
      if (!fs.existsSync(profilePath)) fs.mkdirSync(profilePath);
      
      await Bun.write(profilePath + "/profile.log", logBuffer);

      return "SUCCESS";

    }

    case "read": {

      const profile = await profiledata(["get", steamid], context);

      const logPath = `${context.file.profiles}/${steamid}/profile.log`;
      if (!fs.existsSync(logPath)) throw new UtilError("ERR_NOTFOUND", args, context);

      const file = Bun.file(logPath);
      const buffer = new Uint8Array(await file.arrayBuffer());

      return decodeLog(buffer, profile.categories);

    }
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
