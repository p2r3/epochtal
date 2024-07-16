const UtilError = require("./error.js");

const fs = require("node:fs");

/**
 * Handles the `proof` utility call. This is used to get proof information for a given run.
 *
 * The following subcommands are available:
 * - `type`: Gets the type of proof (demo or video)
 * - `file`: Gets the path to the proof file
 *
 * @param {string[]} args The arguments for the call. `args[1]` should contain the SteamID of the user that submitted
 * the run, `args[2]` should contain the category of the run.
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {Promise<string|string|null>} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid, category] = args;

  const demos = context.file.demos;
  const users = context.data.users;

  switch (command) {

    case "type":
    case "file": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);
      if (!(category in context.data.leaderboard)) throw new UtilError("ERR_CATEGORY", args, context);

      const demoPath = `${demos}/${steamid}_${category}.dem.xz`;
      const linkPath = `${demos}/${steamid}_${category}.link`;

      if (fs.existsSync(demoPath)) return command === "type" ? "demo" : demoPath;
      if (fs.existsSync(linkPath)) return command === "type" ? "video" : linkPath;

      return null;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
