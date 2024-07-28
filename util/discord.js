const UtilError = require("./error.js");

/**
 * Handles the `discord` utility call. This utility is used to interact with the discord server.
 *
 * The following subcommands are available:
 * - `announce`: Send an announcement to the announcements channel
 * - `report`: Send a report to the reports channel
 * - `update`: Send an update to the updates channel
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const command = args[0];

  // Parse the content and files from the arguments
  const content = Array.isArray(args[2]) ? args[1] : args.slice(1).join(" ");
  const files = Array.isArray(args[2]) ? args[2] : [];

  // Send appropriate message to the discord server
  switch (command) {

    case "announce":

      await discordClient.channels.cache.get(context.data.discord.announce).send({ content, files });
      return "SUCCESS";

    case "report":

      await discordClient.channels.cache.get(context.data.discord.report).send({ content, files });
      return "SUCCESS";

    case "update":

      await discordClient.channels.cache.get(context.data.discord.update).send({ content, files });
      return "SUCCESS";

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
