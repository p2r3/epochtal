const UtilError = require("./error.js");

const fs = require("node:fs");

const users = require("./users.js");
const archive = require("./archive.js");
const log = require("./log.js");

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
  
    buffer[offset + 5] = entry.portals;
  
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

      const user = await users(["get", steamid], context);
      if (!user) throw new UtilError("ERR_STEAMID", args, context);

      const archives = await archive(["list"], context);
      const profileLog = [];

      for (let i = 0; i < archives.length; i ++) {

        const archiveContext = await archive(["get", archives[i]], context);
        const logData = await log(["read"], archiveContext);

        for (let j = 0; j < logData.length; j ++) {

          if (logData[j].steamid !== steamid) continue;
          
          const timestamp = logData[j].timestamp + 604800 * (archiveContext.data.week.number - 1)
          logData[j].timestamp = Math.floor(timestamp);
          
          delete logData[j].steamid;

          profileLog.push(logData[j]);
        
        }

      }

      const categoryList = [];

      for (let i = 0; i < profileLog.length; i ++) {
        if (!categoryList.includes(profileLog[i].category)) {
          categoryList.push(profileLog[i].category);
        }
      }

      const logBuffer = encodeLog(profileLog, categoryList);

      const profilePath = `${context.file.profiles}/${steamid}`;
      if (!fs.existsSync(profilePath)) fs.mkdirSync(profilePath);
      
      await Bun.write(profilePath + "/log", logBuffer);
      await Bun.write(profilePath + "/catlist.json", JSON.stringify(categoryList));

      return "SUCCESS";

    }

    case "read": {

      const logPath = `${context.file.profiles}/${steamid}/log`;
      const catlistPath = `${context.file.profiles}/${steamid}/catlist.json`;

      if (!fs.existsSync(logPath)) throw new UtilError("ERR_NOTFOUND", args, context);
      if (!fs.existsSync(catlistPath)) throw new UtilError("ERR_NOTFOUND", args, context);

      const file = Bun.file(logPath);
      const buffer = new Uint8Array(await file.arrayBuffer());
      const categoryList = await Bun.file(catlistPath).json();

      return decodeLog(buffer, categoryList);

    }
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
