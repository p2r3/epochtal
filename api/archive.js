const archive = require("../util/archive.js");

/**
 * Handles `/api/archive/` endpoint requests. This endpoint supports the following commands:
 *
 * - `list`: Lists all sorted archives
 * - `leaderboard`: Fetches the leaderboard of a given archive. Throws ERR_NAME if the archive does not exist.
 * - `config`: Fetches the configuration of a given archive. Throws ERR_NAME if the archive does not exist.
 * - `demo`: Fetches the proof of a given player in a given category. Throws ERR_ARGS if the arguments are invalid and ERR_NOTFOUND if no proof is found.
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {string|Response<BunFile>} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, name] = args;

  switch (command) {

    case "list": {

      // Fetch a sorted list of all archives
      return archive(["list"]);

    }

    case "leaderboard":
    case "config": {

      // Try to fetch the leaderboard or configuration of a given archive
      const context = await archive(["get", name]);
      if (!context) return "ERR_NAME";

      // Return the requested data
      if (command === "leaderboard") return context.data.leaderboard;
      return context.data.week;

    }

  }

  return "ERR_COMMAND";

};
