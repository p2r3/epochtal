const UtilError = require("./error.js");

const { appendFileSync } = require("node:fs");
const categories = require("./categories.js");
const config = require("./config.js");

function parseLog (buffer, categoryList) {

  const log = [];

  for (let i = 0; i < buffer.length / 17; i ++) {

    // each entry is 17 bytes long
    const curr = i * 17;
    const entry = {};

    // 8 bytes - steamid
    let steamid = 0n;
    for (let j = 0; j < 8; j ++) {
      steamid += BigInt(buffer[curr + j]) * BigInt(Math.pow(256, 7 - j));
    }
    entry.steamid = steamid.toString();
    
    // 1 byte - category index
    entry.category = categoryList[buffer[curr + 8]];

    // 4 bytes - run time in ticks
    entry.time = 0;
    for (let j = 0; j < 4; j ++) {
      entry.time += buffer[curr + 9 + j] * Math.pow(256, 3 - j);
    }

    // 1 byte - portal count
    entry.portals = buffer[curr + 13];

    // 3 bytes - seconds since start of the week
    entry.timestamp = 0;
    for (let j = 0; j < 3; j ++) {
      entry.timestamp += buffer[curr + 14 + j] * Math.pow(256, 2 - j);
    }

    // this pattern marks the removal of an entry
    if (entry.time === 0 && entry.portals === 0) {

      for (let j = log.length - 1; j >= 0; j --) {
        // look for the last run by the same user in the same category and remove it
        if (log[j].steamid === entry.steamid && log[j].category === entry.category) {
          log.splice(j, 1);
          break;
        }
      }

    } else {
      
      log.push(entry);

    }
    
  }

  return log;

}

function encodeLogEntry (entry, categoryList) {

  const buffer = new Uint8Array(17);

  const steamid = BigInt(entry.steamid);
  for (let i = 0; i < 8; i ++) {
    buffer[i] = Number(steamid % (256n ** BigInt(8 - i)) / (256n ** BigInt(7 - i)));
  }

  buffer[8] = categoryList.findIndex(curr => curr.name === entry.category);

  for (let i = 0; i < 4; i ++) {
    buffer[9 + i] = entry.time % (256 ** (4 - i)) / (256 ** (3 - i));
  }

  buffer[13] = entry.portals;

  for (let i = 0; i < 3; i ++) {
    buffer[14 + i] = entry.timestamp % (256 ** (3 - i)) / (256 ** (2 - i));
  }

  return buffer;

}

module.exports = async function (args, context = epochtal) {

  const [command] = args;

  const filePath = context.file.log;
  const file = Bun.file(filePath);

  switch (command) {

    case "read": {
      
      const categoryList = await categories(["list"], context);
      const buffer = new Uint8Array(await file.arrayBuffer());
      
      return parseLog(buffer, categoryList);

    }

    case "remove": {

      const timestamp = args[1];
      if (timestamp === undefined) throw new UtilError("ERR_ARGS", args, context);

      const buffer = new Uint8Array(await file.arrayBuffer());
      
      let found = null;
      for (let i = 0; i < buffer.length; i += 17) {

        let curr = 0;
        for (let j = 0; j < 3; j ++) {
          curr += buffer[i + 14 + j] * Math.pow(256, 3 - j);
        }

        if (curr === timestamp) {
          found = i;
          break;
        }

      }

      if (found === null) throw new UtilError("ERR_TIMESTAMP", args, context);

      for (let i = found + 17; i < buffer.length; i ++) {
        buffer[i - 17] = buffer[i];
      }

      await Bun.write(file, buffer.slice(0, -17));
      return "SUCCESS";

    }

    case "add": {
      
      const [steamid, category, time, portals, timestamp] = args.slice(1);
      const entry = {steamid, category, time, portals, timestamp};

      if (!entry.timestamp) {
        const start = await config(["get", "date"], context);
        entry.timestamp = Math.floor((Date.now() - start) / 1000);
      }
      
      for (const key in entry) {
        if (entry[key] === undefined) throw new UtilError("ERR_ARGS", args, context);
      }
      
      const categoryList = await categories(["list"], context);
      const buffer = encodeLogEntry(entry, categoryList);
      
      appendFileSync(filePath, buffer);

      return "SUCCESS";

    }

    case "reconstruct": {

      const categoryList = await categories(["list"], context);
      const date = (await config(["get", "date"], context));
      const buffer = new Uint8Array(await file.arrayBuffer());
      
      const log = parseLog(buffer, categoryList);

      const lb = {};
      for (let i = 0; i < categoryList.length; i ++) {
        lb[categoryList[i]] = [];
      }

      for (let i = log.length - 1; i >= 0; i --) {

        const curr = log[i];
        if (lb[curr.category].find(entry => entry.steamid === curr.steamid)) continue;

        const newRun = {
          steamid: curr.steamid,
          time: curr.time,
          portals: curr.portals,
          date: curr.timestamp + date,
          note: ""
        };

        let inserted = false;

        if (curr.category === "lp") {

          newRun.segmented = false;

          for (let i = 0; i < lb[curr.category].length; i ++) {

            if (newRun.portals > lb[curr.category][i].portals) continue;

            if (newRun.portals === lb[curr.category][i].portals) {
              if (newRun.segmented && !lb[curr.category][i].segmented) continue;
              if (newRun.segmented === lb[curr.category][i].segmented) {
                if (newRun.time >= lb[curr.category][i].time) continue;
              }
            }

            lb[curr.category].splice(i, 0, newRun);
            inserted = true;
            break;
          
          }

        } else {

          delete newRun.portals;

          for (let i = 0; i < lb[curr.category].length; i ++) {

            if (newRun.time >= lb[curr.category][i].time) continue;

            lb[curr.category].splice(i, 0, newRun);
            inserted = true;
            break;
          
          }
          
        }

        if (!inserted) lb[curr.category].push(newRun);

      }
      
      return lb;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};

