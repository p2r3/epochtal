const UtilError = require("./error.js");

/**
 * Handles the `flush` utility call. This utility is used to synchronize the application memory and the filesystem.
 *
 * The following subcommands are available:
 * - `memory`: Sets application memory equal to data found on disk
 * - `disk`: Sets filesystem data equal to application memory
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {Promise<string>} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command] = args;

  switch (command) {

    case "memory": {

      context.data.leaderboard = await context.file.leaderboard.json();
      context.data.users = await context.file.users.json();
      context.data.week = await context.file.week.json();
      context.data.spplice.index = await context.file.spplice.index.json();

      return "SUCCESS";

    }

    case "disk": {

      await Bun.write(context.file.leaderboard, JSON.stringify(context.data.leaderboard));
      await Bun.write(context.file.users, JSON.stringify(context.data.users));
      await Bun.write(context.file.week, JSON.stringify(context.data.week));
      await Bun.write(context.file.spplice.index, JSON.stringify(context.data.spplice.index));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
