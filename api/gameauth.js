const gameauth = require("../util/gameauth.js");
const events = require("../util/events.js");
const api_users = require("./users.js");

/**
 * Handles `/api/gameauth/` endpoint requests. This endpoint supports the following commands:
 *
 * - `connect`: Binds the provided auth code to the user and waits for it to be verified before upgrading the request to a WebSocket connection
 * - `verify`: Checks the bound code and resolves the promise of a WebSocket connection
 *
 * @param {[string, number]} args The arguments for the API request, in order: command name, numeric auth code, SteamID (only for game client)
 * @param {HttpRequest} request The HTTP request object
 * @returns {Promise<string|undefined>} The response of the API request. In the event of <undefined>, the Request is upgraded to a WebSocket connection
 */
module.exports = async function (args, request) {

  const [command, authcode, steamid] = args;

  const server = epochtal.data.events.server;

  switch (command) {

    case "connect": {

      // Ensure that a game client event for this user exists
      const eventName = `game_${steamid}`;
      try {
        await events(["get", eventName]);
      } catch {
        await events(["create", eventName]);
      }

      // Stall here until the auth code is verified by the logged in user
      await new Promise(async function (resolve) {
        await gameauth(["set", steamid, authcode, resolve]);
      });

      // Upgrade the connection to a WebSocket
      if (server.upgrade(request, { data: { eventName, steamid } })) return;
      return "ERR_PROTOCOL";

    }

    case "verify": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // The gameauth utility performs the actual verification
      return await gameauth(["verify", user.steamid, authcode]);

    }

  }

  return "ERR_COMMAND";

};
