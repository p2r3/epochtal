const UtilError = require("./error.js");

/**
 * Handles the <code>votes</code> utility call. This utility can do the following based on the (sub)command that gets called:
 *
 * - <code>get</code>: Gets the votes of a steam user by their SteamID. If the user has not voted yet,
 * it returns an array of zeroes of the same length as the number of maps in the current week.
 * Throws ERR_STEAMID if the SteamID is not found in all users.
 *
 * - <code>upvote</code>: Upvotes a map for a user by their SteamID. Throws ERR_LOCKED if the week is not in voting mode and ERR_MAP if the map index is invalid.
 *
 * - <code>downvote</code>: Downvotes a map for a user by their SteamID. Throws ERR_LOCKED if the week is not in voting mode and ERR_MAP if the map index is invalid.
 *
 * - <code>reset</code>: Resets the votes of a user by their SteamID. Throws ERR_LOCKED if the week is not in voting mode and ERR_MAP if the map index is invalid.
 *
 * @param args An array where the first item is the (sub)command to call, and the second item is the appropriate SteamID
 * @param context The context on which to execute the call
 * @returns {Promise<int|string>} The result of the utility call
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
