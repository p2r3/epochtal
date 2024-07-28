const UtilError = require("./error.js");

const fs = require("node:fs");

const archive = require("./archive.js");
const weeklog = require("./weeklog.js");
const profiledata = require("./profiledata.js");

/**
 * Parses a profilelog buffer into an array of objects
 *
 * @param {Uint8Array} buffer Buffer containing profilelog data
 * @param {string[]} categoryList List of categories
 * @returns {object[]} Array of objects representing profilelog entries
 */
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

/**
 * Encodes a profilelog entry object array into a buffer
 *
 * @param {object[]} log Array of objects representing profilelog entries
 * @param {string[]} categoryList List of categories
 * @returns {Uint8Array} Buffer containing profilelog data
 */
function encodeLog (log, categoryList) {

  // each entry is 10 bytes long
  const buffer = new Uint8Array(10 * log.length);

  for (let j = 0; j < log.length; j ++) {

    const offset = j * 10;
    const entry = log[j];

    // 1 byte - category index
    buffer[offset] = categoryList.indexOf(entry.category);

    // 4 bytes - run time in ticks
    for (let i = 0; i < 4; i ++) {
      buffer[offset + 1 + i] = entry.time % (256 ** (4 - i)) / (256 ** (3 - i));
    }

    // 1 byte - portal count
    buffer[offset + 5] = Math.min(entry.portals, 255);

    // 4 bytes - seconds since start of week 0
    for (let i = 0; i < 4; i ++) {
      buffer[offset + 6 + i] = entry.timestamp % (256 ** (4 - i)) / (256 ** (3 - i));
    }

  }

  return buffer;

}

/**
 * Handles the `profilelog` utility call. This utility is used to manage profile logs.
 *
 * The following subcommands are available:
 * - `build`: Build a profile log for a given steamid
 * - `read`: Read a profile log for a given steamid
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid] = args;

  switch (command) {

    case "build": {

      // Encode all week archives into the profile log
      const archives = await archive(["list"], context);
      const profileLog = [];

      for (let i = archives.length - 1; i >= 0; i --) {

        // Grab weeklog data from archive
        const archiveContext = await archive(["get", archives[i]], context);
        const logData = await weeklog(["read"], archiveContext);

        const times = {};

        // Add all runs by given player to the profile log
        for (let j = 0; j < logData.length; j ++) {

          const run = logData[j];

          // Add runs by other players to list of times
          if (run.steamid !== steamid) {

            if (!(run.category in times)) {
              times[run.category] = {};
            }
            times[run.category][run.steamid] = run.time;

            continue;
          }

          // Calculate placement of run at time of submission
          let placement = 0;
          for (const curr in times[run.category]) {
            if (times[run.category][curr] < run.time) placement ++;
          }
          logData[j].placement = placement;

          // Set timestamp of log entry
          const timestamp = logData[j].timestamp + 604800 * (archiveContext.data.week.number - 1);
          logData[j].timestamp = Math.floor(timestamp);

          // Add run to profile log
          profileLog.push(logData[j]);

        }

      }

      // List all categories in the profile log
      const categoryList = [];
      for (let i = 0; i < profileLog.length; i ++) {
        if (!categoryList.includes(profileLog[i].category)) {
          categoryList.push(profileLog[i].category);
        }
      }

      // Encode obtained profile data and log
      await profiledata(["edit", steamid, "categories", categoryList], context);

      const logBuffer = encodeLog(profileLog, categoryList);

      // Write profile log to file
      const profilePath = `${context.file.profiles}/${steamid}`;
      if (!fs.existsSync(profilePath)) fs.mkdirSync(profilePath);

      await Bun.write(profilePath + "/profile.log", logBuffer);

      return "SUCCESS";

    }

    case "read": {

      // Read profile log from profile data
      const profile = await profiledata(["get", steamid], context);

      const logPath = `${context.file.profiles}/${steamid}/profile.log`;
      if (!fs.existsSync(logPath)) throw new UtilError("ERR_NOTFOUND", args, context);

      const file = Bun.file(logPath);
      const buffer = new Uint8Array(await file.arrayBuffer());

      // Decode profile log and return
      return decodeLog(buffer, profile.categories);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
