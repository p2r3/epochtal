const UtilError = require("./error.js");

/**
 * Handles the `votes` utility call. This utility is used to manage votes for maps.
 *
 * The following subcommands are available:
 * - `get`: Get all votes of the in `args[1]` specified steamid.
 * - `upvote/downvote/reset`: Upvotes, downvotes or resets the vote for steamid `args[1]` on map `args[2]`.
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call
 * @returns {int[]|string} The result of the utility call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid, map] = args;

  const file = context.file.week;
  const week = context.data.week;
  const users = context.data.users;

  // Check if the steamid is valid
  if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

  switch (command) {

    case "get": {

      // Return the votes of the user or an array of zeroes if the user has not voted yet
      return week.votes[steamid] || Array(week.votingmaps.length).fill(0);

    }

    case "upvote":
    case "downvote":
    case "reset": {

      // Check if the week is in voting mode
      if (!week.voting) throw new UtilError("ERR_LOCKED", args, context);

      // Check if the map index is valid
      if ((!map && map !== 0) || map < 0 || map > week.votingmaps.length - 1) throw new UtilError("ERR_MAP", args, context);

      // Ensure the user has a vote array
      if (!week.votes[steamid]) {
        week.votes[steamid] = Array(week.votingmaps.length).fill(0);
      }

      // Upvote, downvote, or reset the vote and write the changes to the week json file
      week.votes[steamid][map] = command === "upvote" ? 1 : (command === "downvote" ? -1 : 0);
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
