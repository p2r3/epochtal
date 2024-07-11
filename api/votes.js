const votes = require("../util/votes.js");
const api_users = require("./users.js");

/**
 * Handles `/api/votes/` endpoint requests. This endpoint supports the following commands:
 *
 * - `get`: Get a user's votes.
 * - `upvote`: Upvote a map.
 * - `downvote`: Downvote a map.
 *
 * @param args The arguments for the api request
 * @param request The http request object
 * @returns {int|object} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, map] = args;

  // Get the active user and throw ERR_LOGIN if not logged in
  const user = await api_users(["whoami"], request);
  if (!user) return "ERR_LOGIN";

  switch (command) {

    case "get": {

      // Get all votes for the specified user
      return await votes(["get", user.steamid]);

    }

    case "upvote":
    case "downvote": {

      // Upvote or downvote the specified map
      return await votes([command, user.steamid, map]);

    }

  }

  return "ERR_COMMAND";

};
