const UtilError = require("./error.js");

/**
 * Handles the `gameauth` utility call. This authenticates WebSocket conntections for Portal 2 game clients.
 * Authentication works by exchanging a one-time numeric code and verifying it on the website, where the user
 * is logged in with their Steam token.
 *
 * The following subcommands are available:
 * - `set`: Binds the provided code to the user's SteamID
 * - `verify`: Runs the callback function if the provided code matches the one bound to the user's SteamID
 *
 * @param {[string, string, number, function]} args The arguments for the call, in order: command name, user's SteamID, one-time code, callback function
 * @param {unknown} [context=epochtal] The context on which to execute the call
 * @returns {Promise<string>} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid, authcode, callback] = args;

  const { gameauth, users } = context.data;

  if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

  switch (command) {

    case "set": {

      if (typeof authcode !== "number") throw new UtilError("ERR_CODETYPE", args, context);
      gameauth[steamid] = { authcode, callback };

      return "SUCCESS";

    }

    case "verify": {

      if (gameauth[steamid].authcode === authcode) {
        gameauth[steamid].callback();
        delete gameauth[steamid];
      } else {
        throw new UtilError("ERR_AUTHCODE", args, context);
      }

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
