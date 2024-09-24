const lobbies = require("../util/lobbies.js");
const api_users = require("./users.js");

/**
 * Checks if the user making the request is a member of the given lobby.
 * Returns the user object and lobby list data as products.
 *
 * @param {HttpRequest} request The HTTP request
 * @param {string} name The lobby name
 * @returns {object|string} User object and lobby list data, or error string
 */
async function checkUserPerms (request, name) {

  // Get the active user and throw ERR_LOGIN if not logged in
  const user = await api_users(["whoami"], request);
  if (!user) return "ERR_LOGIN";

  // Get the specified lobby's list entry and throw ERR_PERMS if the user is not in the lobby
  const listEntry = await lobbies(["get", name]);
  if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

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
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {string|object|boolean} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, name, password] = args;

  switch (command) {

    case "list": {

      // Fetch and return the list of lobbies
      return await lobbies(["list"]);

    }

    case "create": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Create a new lobby with the specified name and password
      await lobbies(["create", name, password]);

      // Join the newly created lobby
      await lobbies(["join", name, password, user.steamid]);

      return "SUCCESS";

    }

    case "join": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Join the specified lobby with the specified password
      if (password) {
        await lobbies(["join", name, password, user.steamid]);
      } else {
        await lobbies(["join", name, false, user.steamid]);
      }

      return "SUCCESS";

    }

    case "secure": {

      // Check if the specified lobby is password-protected
      const password = (await lobbies(["getdata", name])).password;

      if (password) return true;
      return false;

    }

    case "get": {

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, name);
      if (typeof permsCheck === "string") return permsCheck;
      const { listEntry } = permsCheck;

      const data = await lobbies(["getdata", name]);

      // Filter returned data to omit unwanted properties
      const clientData = {
        players: Object.fromEntries(
          Object.entries(data.players).map(([key, player]) => [key, { ready: player.ready }])
        ),
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
       *   state,
       *   context: {
       *     map,
       *     leaderboard,
       *     week
       *   }
       * }
       */

      return { listEntry, data: clientData };

    }

    case "rename": {

      const newName = args[2];

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, name);
      if (typeof permsCheck === "string") return permsCheck;

      // Rename the specified lobby
      return lobbies(["rename", name, newName]);

    }

    case "password": {

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, name);
      if (typeof permsCheck === "string") return permsCheck;

      // Set the specified lobby's password
      return lobbies(["password", name, password]);

    }

    case "map": {

      const mapid = args[2];

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, name);
      if (typeof permsCheck === "string") return permsCheck;

      // Set the specified lobby's map
      return lobbies(["map", name, mapid]);

    }

    case "ready": {

      const readyState = args[2];

      // Check if the player is a member of this lobby
      const permsCheck = await checkUserPerms(request, name);
      if (typeof permsCheck === "string") return permsCheck;
      const { user } = permsCheck;

      // Attempt to change the ready state
      return lobbies(["ready", name, readyState, user.steamid]);

    }

  }

  return "ERR_COMMAND";

};
