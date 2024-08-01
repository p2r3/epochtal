const gameauth = require("../util/gameauth.js");
const events = require("../util/events.js");
const api_users = require("./users.js");

/**
 * Handles `/api/gameauth/` endpoint requests. This endpoint supports the following commands:
 *
 * - `connect`: Binds the provided auth code to the user and waits for it to be verified before upgrading the request to a WebSocket connection
 * - `verify`: Checks the bound code and resolves the promise of a WebSocket connection
 * - `check`: Checks if an authcode has been bound to the user
 *
 * @param {string[]} args The arguments for the API request, in order: command name, auth code, SteamID (only for game client)
 * @param {HttpRequest} request The HTTP request object
 * @returns {Promise<string|boolean|undefined>} The response of the API request. In the event of <undefined>, the Request is upgraded to a WebSocket connection
 */
module.exports = async function (args, request) {

  const [command, authcode, steamid] = args;

  const server = epochtal.data.events.server;

  // Get the active user and throw ERR_LOGIN if not logged in
  // The "connect" command originates from Spplice without a Steam cookie, and so is an exception to this
  let user;
  if (command !== "connect") {
    user = await api_users(["whoami"], request);
    if (!user) return "ERR_LOGIN";
  }

  switch (command) {

    case "connect": {

      const event = `game_${steamid}`;

      // Send heartbeat ping every 30s
      const connectHandler = function () {
        const interval = setInterval(async function () {
          if (await events(["get", event])) {
            await events(["send", event, { type: "ping" }]);
          } else {
            clearInterval(interval);
          }
        }, 30000);
      };
      // Delete the event once the client disconnects
      const disconnectHandler = async function () {
        await events(["delete", event]);
      };

      // Create a game client event for this user
      try {
        await events(["create", event, null, null, connectHandler, disconnectHandler]);
      } catch (e) {
        if (e.message !== "ERR_EXISTS") throw e;
      }

      // Stall here until the auth code is verified by the logged in user
      await new Promise(async function (resolve) {
        await gameauth(["set", steamid, authcode, resolve]);
      });

      // Upgrade the connection to a WebSocket
      if (server.upgrade(request, { data: { event, steamid } })) return;
      return "ERR_PROTOCOL";

    }

    case "check": {

      // Get the code from the gameauth utility - this will be null if no code is bound
      const code = await gameauth(["get", user.steamid]);

      if (code === null) return false;
      return true;

    }

    case "verify": {

      // The gameauth utility performs the actual verification
      return await gameauth(["verify", user.steamid, authcode]);

    }

  }

  return "ERR_COMMAND";

};
