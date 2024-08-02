const UtilError = require("./error.js");
const UtilPrint = require("../util/print.js");

const fs = require("node:fs");
const proof = require("./proof.js");

/**
 * Checks if the given name is valid.
 * A name is considered valid if it is not falsy, does not contain two consecutive dots or a forward slash.
 *
 * @param {string} name The name to check
 * @returns {boolean} Whether the name is valid
 */
function isValidName (name) {
  return name && !name.includes("..") && !name.includes("/");
}

/**
 * Creates a context from the given archive and returns it.
 *
 * @param {string} path The path to the context root
 * @returns {Promise<{file: {}, data: {}}>} A context object with the following fields:
 * - `file`: References to all files and directories on disk that are being used by the context
 * - `data`: Context data, stored in a more readable object format for better integration with the code
 * - `name`: The name of the context
 */
async function getArchiveContext (name) {

  // Throw an error if the name is invalid
  if (!isValidName(name)) return "ERR_NAME";

  // Get the full path of the archive
  const path = `${gconfig.datadir}/archives/${name}`;
  if (!fs.existsSync(path)) return "ERR_NAME";

  const context = { file: {}, data: {} };

  // Load files into the context
  context.file = {
    leaderboard: Bun.file(`${path}/leaderboard.json`),
    users: epochtal.file.users,
    profiles: epochtal.file.profiles,
    week: Bun.file(`${path}/config.json`),
    log: `${path}/week.log`,
    vmfs: `${path}/maps`,
    demos: `${path}/proof`,
    sar: {
      filesums: `${path}/mdp/filesum_whitelist.txt`,
      sarsums: `${path}/mdp/sar_whitelist.txt`
    }
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
 * Handles the `archive` utility call. This utility is used to manage the archives.
 *
 * The following subcommands are available:
 * - `list`: Get all archive entries sorted by week number.
 * - `get`: Get the full archived context of the in `args[1]` specified archive.
 * - `assume`: Run the `args[2]` utility with `args[3..]` parameters by assuming the archived context of `args[1]`.
 * - `create`: Create an archive based on the current context, with the name specified in `args[1]`. If `args[2]` is `true`, the archive creation will not fail if the archive already exists.

 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  switch (command) {

    case "list": {

      /**
       * Gets the week number from the archive name.
       *
       * @param {string} str The archive name
       * @returns {number|null} The week number. Returns `null` if the archive name contains no numbers
       */
      const getWeekNumber = function (str) {
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      };

      // List and sort archive names
      const list = fs.readdirSync(`${gconfig.datadir}/archives`);
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

      // Throw an error if the name is invalid
      if (name && !isValidName(name)) throw new UtilError("ERR_NAME", args, context);

      // Get the path of the archive to create
      let archivePath = `${gconfig.datadir}/archives/${name || ("week" + context.data.week.number)}`;

      /**
       * Whether to force the archive creation. If this is `true` and the filesystem path of the archive
       * already exists, it will iterate up to 32 times, appending `_i` to the end of the file path (where
       * `i` is the iteration number, starting at 1). When it finds an available path, it will be logged and
       * the archive creation process will continue with the new path.
       *
       * @type {boolean}
       */
      const force = !!args[2];

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

      // Copy context files to the archive
      fs.mkdirSync(archivePath);
      await Bun.write(`${archivePath}/leaderboard.json`, context.file.leaderboard);
      await Bun.write(`${archivePath}/config.json`, context.file.week);
      await Bun.write(`${archivePath}/week.log`, Bun.file(context.file.log));

      const mapmodPath = `${context.file.portal2}/scripts/vscripts/epochtalmapmod.nut`;
      if (fs.existsSync(mapmodPath)) {
        await Bun.write(`${archivePath}/epochtalmapmod.nut`, Bun.file(mapmodPath));
      }

      fs.mkdirSync(`${archivePath}/proof`);
      fs.mkdirSync(`${archivePath}/maps`);
      fs.mkdirSync(`${archivePath}/mdp`);

      // Move context demo files to archive
      const files = fs.readdirSync(context.file.demos);
      for (let i = 0; i < files.length; i ++) {
        fs.renameSync(`${context.file.demos}/${files[i]}`, `${archivePath}/proof/${files[i]}`);
      }

      // Move vmf files to archive
      const vmfs = fs.readdirSync(context.file.vmfs);
      for (let i = 0; i < vmfs.length; i ++) {
        fs.renameSync(`${context.file.vmfs}/${vmfs[i]}`, `${archivePath}/maps/${vmfs[i]}`);
      }

      // Copy mdp checksums to archive
      await Bun.write(`${archivePath}/mdp/filesum_whitelist.txt`, Bun.file(context.file.mdp.filesums));
      await Bun.write(`${archivePath}/mdp/sar_whitelist.txt`, Bun.file(context.file.mdp.sarsums));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
