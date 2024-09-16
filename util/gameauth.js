const UtilError = require("./error.js");

/**
 * Handles the `gameauth` utility call. This authenticates WebSocket conntections for Portal 2 game clients.
 * Authentication works by exchanging a one-time numeric code and verifying it on the website, where the user
 * is logged in with their Steam token.
 *
 * The following subcommands are available:
 * - `set`: Binds the provided code to the user's SteamID
 * - `verify`: Runs the callback function if the provided code matches the one bound to the user's SteamID
 * - `get`: Returns the authcode bound to the user's SteamID
 *
 * @param {[string, string, string, function]} args The arguments for the call, in order: command name, user's SteamID, one-time code, callback function
 * @param {unknown} [context=epochtal] The context on which to execute the call
 * @returns {Promise<string|null>} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid, authcode, callback] = args;

  const { gameauth, users } = context.data;

  if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

  switch (command) {

    case "set": {

      if (isNaN(authcode)) throw new UtilError("ERR_CODEFORMAT", args, context);
      gameauth[steamid] = { authcode, callback };

      return "SUCCESS";

    }

    case "get": {

      if (steamid in gameauth) return gameauth[steamid].authcode;
      return null;

    }

    case "verify": {

      if (gameauth[steamid].authcode === authcode) {
        // FIXME: For some reason, the callback hangs the server, likely a Bun bug
        // So we instead return a response first, and only then run the callback
        try {
          return "SUCCESS";
        } finally {
          // This timeout is awfully dirty, but it seems necessary
          setTimeout(function () {
            gameauth[steamid].callback();
            delete gameauth[steamid];
          }, 500);
        }
      } else {
        throw new UtilError("ERR_AUTHCODE", args, context);
      }

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
