const lobbies = require("../util/lobbies.js");
const api_users = require("./users.js");

/**
 * Checks if the user making the request is a member of the given lobby.
 * Returns the user object and lobby list data as products.
 *
 * @param {HttpRequest} request The HTTP request
 * @param {string} lobbyid The lobby ID
 * @param {boolean} checkHost Whether to check if this user is the host
 * @returns {object|string} User object and lobby list data, or error string
 */
async function checkUserPerms (request, lobbyid, checkHost = false) {

  // Get the active user and throw ERR_LOGIN if not logged in
  const user = await api_users(["whoami"], request);
  if (!user) return "ERR_LOGIN";

  // Get the specified lobby's list entry and throw ERR_PERMS if the user is not in the lobby
  const listEntry = await lobbies(["get", lobbyid]);
  if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

  if (checkHost) {
    // Get the specified lobby's data entry and determine whether this user is the host
    const dataEntry = await lobbies(["getdata", lobbyid]);
    if (dataEntry.host !== user.steamid) return "ERR_PERMS";
  }

  // Return the products of this operation for further use
  return { user, listEntry };

}

/**
 * Handles `/api/lobbies/` endpoint requests. This endpoint supports the following commands:
 *
 * - `list`: List all lobbies.
 * - `create`: Create a new lobby.
 * - `join`: Join an existing lobby.
 * - `secure`: Check if a lobby is password-protected.
 * - `get`: Get a lobby's data.
 * - `rename`: Rename a lobby.
 * - `password`: Set a lobby's password.
 * - `maxplayers`: Set the maximum player count of the lobby
 * - `map`: Set the active lobby map
 * - `ready`: Set the player's ready state
 * - `host`: Transfer the host role to the specified player
 * - `kick`: Remove the specified player from the lobby
 * - `start`: Force start the game
 * - `abort`: Force stop the game (everyone is set to "not ready")
 * - `spectate`: Add or remove the calling player from the spectators list
 * - `chat`: Send a chat message to be broadcasted within the lobby
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {string|object|boolean} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, lobbyid, password] = args;

  switch (command) {

    case "list": {

      // Fetch and return the list of lobbies
      return await lobbies(["list"]);

    }

    case "create": {

      const name = args[1];

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Create a new lobby with the specified name and password
      const response = await lobbies(["create", name, password]);
      const newID = response.split("SUCCESS ")[1];

      // Join the newly created lobby
      await lobbies(["join", newID, password, user.steamid]);

      return response;

    }

    case "join": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Join the specified lobby with the specified password
      if (password) {
        await lobbies(["join", lobbyid, password, user.steamid]);
      } else {
        await lobbies(["join", lobbyid, false, user.steamid]);
      }

      return "SUCCESS";

    }

    case "secure": {

      // Check if the specified lobby is password-protected
      const password = (await lobbies(["getdata", lobbyid])).password;

      if (password) return true;
      return false;

    }

    case "get": {

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid);
      if (typeof permsCheck === "string") return permsCheck;
      const { listEntry } = permsCheck;

      const data = await lobbies(["getdata", lobbyid]);

      // Filter returned data to omit unwanted properties
      const clientData = {
        players: Object.fromEntries(
          Object.entries(data.players).map(([key, player]) => [key, { ready: player.ready }])
        ),
        maxplayers: data.maxplayers,
        host: data.host,
        spectators: data.spectators,
        state: data.state,
        context: data.context.data
      };
      /** The above results in an object with the following pseudo-structure:
       * {
       *   players: {
       *     steamid: { ready },
       *     steamid: { ready },
       *     ...
       *   },
       *   maxplayers,
       *   host,
       *   spectators,
       *   state,
       *   context: {
       *     map,
       *     maps,
       *     leaderboard,
       *     week
       *   }
       * }
       */

      return { listEntry, data: clientData };

    }

    case "rename": {

      const newName = args[2];

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Rename the specified lobby
      return lobbies(["rename", lobbyid, newName]);

    }

    case "password": {

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Set the specified lobby's password
      return lobbies(["password", lobbyid, password]);

    }

    case "maxplayers": {

      const maxplayers = args[2];

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Set the specified lobby's max player count
      return lobbies(["maxplayers", lobbyid, maxplayers]);

    }

    case "map": {

      const mapid = args[2];

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Set the specified lobby's map
      return lobbies(["map", lobbyid, mapid]);

    }

    case "ready": {

      const readyState = args[2];

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid);
      if (typeof permsCheck === "string") return permsCheck;
      const { user } = permsCheck;

      // Attempt to change the ready state
      return lobbies(["ready", lobbyid, readyState, user.steamid]);

    }

    case "host": {

      const newHost = args[2];

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Transfer the host role
      return lobbies(["host", lobbyid, newHost]);

    }

    case "kick": {

      const steamid = args[2];

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Force the specified player to leave
      return lobbies(["leave", lobbyid, steamid]);

    }

    case "start": {

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Force start the game
      return lobbies(["start", lobbyid]);

    }

    case "abort": {

      // Check if the player is the host of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid, true);
      if (typeof permsCheck === "string") return permsCheck;

      // Abort the game
      return lobbies(["abort", lobbyid]);

    }

    case "spectate": {

      const spectatorState = args[2];

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid);
      if (typeof permsCheck === "string") return permsCheck;
      const { user } = permsCheck;

      // Toggle the player's spectator state
      return lobbies(["spectate", lobbyid, spectatorState, user.steamid]);

    }

    case "chat": {

      const message = args[2];

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, lobbyid);
      if (typeof permsCheck === "string") return permsCheck;
      const { user } = permsCheck;

      // Send the message
      return lobbies(["chat", lobbyid, message, user.steamid]);

    }

  }

  return "ERR_COMMAND";

};
