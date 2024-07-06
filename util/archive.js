const UtilError = require("./error.js");
const UtilPrint = require("../util/print.js");

const fs = require("node:fs");
const proof = require("./proof.js");

/**
 * Checks if the given name is valid.
 * A name is considered valid if it is not falsy, does not contain two consecutive dots or a forward slash.
 *
 * @param name The name to check
 * @returns {boolean} Whether the name is valid
 */
function isValidName (name) {
  return name && !name.includes("..") && !name.includes("/");
}

/**
 * Creates a context from the given archive and returns it.
 *
 * @param path The path to the context root
 * @returns {Promise<{file: {}, data: {}}>} A context object with the following fields:
 * - <code>file</code>: References to all files and directories on disk that are being used by the context
 * - <code>data</code>: Context data, stored in a more readable object format for better integration with the code
 * - <code>name</code>: The name of the context
 */
async function getArchiveContext (name) {

  // Throw an error if the name is invalid
  if (!isValidName(name)) return "ERR_NAME";

  // Get the full path of the archive
  const path = `${__dirname}/../pages/archive/${name}`;
  if (!fs.existsSync(path)) return "ERR_NAME";

  const context = { file: {}, data: {} };

  // Load files into the context
  context.file = {
    leaderboard: Bun.file(`${path}/leaderboard.json`),
    users: epochtal.file.users,
    profiles: epochtal.file.profiles,
    week: Bun.file(`${path}/week.json`),
    log: `${path}/week.log`,
    demos: `${path}/demos`
  };

  // Parse file data into the context data
  context.data = {
    leaderboard: await context.file.leaderboard.json(),
    users: epochtal.data.users,
    profiles: epochtal.data.profiles,
    week: await context.file.week.json()
  };

  // Get the context name from the archive data
  context.name = `archive_week${context.data.week.number}`;

  // Load proof for all runs
  for (const category in context.data.leaderboard) {
    for (const run of context.data.leaderboard[category]) {

      run.proof = await proof(["type", run.steamid, category], context);

    }
  }

  return context;

}

/**
 * Handles the <code>archive</code> utility call. This utility can do the following based on the first value passed to
 * <code>args</code>:
 *
 * <code>list</code>: Gets all archive entries and returns a sorted list of the archive names.
 *
 * <code>get</code>: Creates the full context of an archive with the name as specified as the second value passed to <code>args</code>.
 * See {@link getArchiveContext}.
 *
 * <code>assume</code>: Runs a utility by assuming an archive's context. The name of the archive has to be passed as the
 * second value in <code>args</code>, and the name of the utility to run as the third value in <code>args</code>. All
 * other remaining arguments will be passed to the utility.
 *
 * <code>create</code>: Copies the current context to an archive. Demo files are moved to the archive upon creation. The
 * name of the archive to create may to be passed as the second value in <code>args</code>. If it isn't, the name will
 * automatically be created based on the week number found in the context data (formatted as <code>weekX</code> where
 * <code>X</code> is the week number). Fails if an archive with this name already exists on disk. Can optionally be
 * forced by passing <code>true</code> as the third value in <code>args</code>. If forced, and an archive with this name
 * already exists, it will iterate up to 32 times, appending <code>_i</code> to the end of the archive name (where
 * <code>i</code> is the iteration number, starting at 1). If it finds an available name, the archive creation process
 * will continue with the new name.
 *
 * <code>demo</code>: Gets the proof for a run in a given archive with the specified SteamID and category. Throws
 * ERR_NOTFOUND if no proof exists within the given criteria. Needs the name of the archive to be passed as the second
 * value in <code>args</code>, the SteamID to check as the third value in <code>args</code>, and the category to check
 * as the fourth value in <code>args</code>.
 *
 * @param args The arguments for the call
 * @param context The context on which to execute the call
 * @returns {Promise<*|{file: {}, data: {}}|string[]|BunFile|string>} The result of the utility call
 */
module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  switch (command) {

    case "list": {

      /**
       * Gets the week number from the archive name.
       *
       * @param str The archive name
       * @returns {number|null} The week number. Returns <code>null</code> if the archive name contains no numbers
       */
      const getWeekNumber = function (str) {
        let match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      };

      // Get the archive names from the filesystem
      const list = fs.readdirSync(`${__dirname}/../pages/archive`);
      // Sort the archive entries by week number
      list.sort(function (a, b) {
        return getWeekNumber(b) - getWeekNumber(a);
      });
      return list;

    }

    case "get": {

      // Try to get the context of the archive with the given name
      const archiveContext = await getArchiveContext(name);
      if (typeof archiveContext === "string") {
        throw new UtilError(archiveContext, args, context);
      }

      return archiveContext;

    }

    case "assume": {

      // Try to get the context of the archive with the given name
      const archiveContext = await getArchiveContext(name);
      if (typeof archiveContext === "string") {
        throw new UtilError(archiveContext, args, context);
      }

      const utilName = args[2];
      const utilArgs = args.slice(3);

      // Throw an error if the utility name is invalid
      if (!utilName || utilName.includes("..") || utilName.includes("/")) throw new UtilError("ERR_ARGS", args, context);
      if (!fs.existsSync(`${__dirname}/${utilName}.js`)) throw new UtilError("ERR_UTIL", args, context);

      // Run the utility with the given arguments and the archive context.
      // This will fail if circular dependencies with archive.js are encountered...
      const util = require(`${__dirname}/${utilName}.js`);
      return await util(utilArgs, archiveContext);

    }

    case "create": {

      /// Throw an error if the name is invalid
      if (name && !isValidName(name)) throw new UtilError("ERR_NAME", args, context);

      // Get the path of the archive to create
      let archivePath = `${__dirname}/../pages/archive/${name || ("week" + context.data.week.number)}`;

      /**
       * Whether to force the archive creation. If this is <code>true</code> and the filesystem path of the archive
       * already exists, it will iterate up to 32 times, appending <code>_i</code> to the end of the file path (where
       * <code>i</code> is the iteration number, starting at 1). When it finds an available path, it will be logged and
       * the archive creation process will continue with the new path.
       *
       * @type {boolean}
       */
      const force = !!args[2];

      // See the JSDoc above, it pretty much sums up this loop lol
      if (force && fs.existsSync(archivePath)) {
        const originalPath = archivePath;
        for (let i = 1; i < 32; i ++) {
          archivePath = originalPath + "_" + i;
          if (!fs.existsSync(archivePath)) break;
        }
        if (archivePath !== originalPath) {
          UtilPrint(`Warning: Forcing archive creation under new path "${archivePath}"`, context);
        }
      }

      // Throw an error if the path already exists
      if (fs.existsSync(archivePath)) {
        throw new UtilError("ERR_EXISTS", args, context);
      }
      // If it doesn't, create the directory
      fs.mkdirSync(archivePath);

      // Copy context files to the archive
      await Bun.write(`${archivePath}/leaderboard.json`, context.file.leaderboard);
      await Bun.write(`${archivePath}/week.json`, context.file.week);
      await Bun.write(`${archivePath}/week.log`, Bun.file(context.file.log));

      // Copy "mapmod" file to archive if it exists
      const mapmodPath = `${context.file.portal2}/scripts/vscripts/epochtalmapmod.nut`;
      if (fs.existsSync(mapmodPath)) {
        await Bun.write(`${archivePath}/epochtalmapmod.nut`, Bun.file(mapmodPath));
      }

      fs.mkdirSync(`${archivePath}/demos`);

      // Move context demo files to archive
      // This moves (renames) the files instead of copying them. This differs from other data, which gets copied.
      const files = fs.readdirSync(context.file.demos);
      for (let i = 0; i < files.length; i ++) {
        fs.renameSync(`${context.file.demos}/${files[i]}`, `${archivePath}/demos/${files[i]}`);
      }

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
