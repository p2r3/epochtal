const UtilError = require("./error.js");

const keys = require("../../keys.js");
const profiledata = require("./profiledata.js");

/**
 * Handles the `avatar` utility call. This utility can do the following based on the (sub)command that gets called:
 *
 * - `get`: Gets the locally stored avatar of the user with the specified SteamID.
 * - `update`: Fetches the avatar of the given SteamID from the Steam API, and updates the locally stored version.
 * - `fetch`: Fetches the avatar of the given SteamID from the Steam API and returns it.
 *
 * @param args The arguments for the call
 * @param context The context on which to execute the call
 * @returns {unknown} The result of the utility call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid] = args;

  switch (command) {

    case "get": {

      const profile = await profiledata(["get", steamid], context);
      return profile.avatar;

    }

    case "update":
    case "fetch": {

      // Get user data from Steam API
      const apiRequest = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2?key=${keys.steam}&steamids=${steamid}`);
      if (apiRequest.status !== 200) throw new UtilError("ERR_STEAMAPI", args, context);

      // Try to get the medium avatar from the API response
      let avatar;
      try {
        avatar = (await apiRequest.json()).response.players[0].avatarmedium;
      } catch (e) {
        throw new UtilError("ERR_STEAMAPI: " + e.message, args, context, "avatar", e.stack);
      }

      // In my opinion it would be cleaner to break out this switch branch (up until this point) into its own function,
      // and individually call the function in the "update" and "fetch" branches. This way, you wouldn't need to check
      // "command" twice, does that make sense? It's probably up to preference but there's an idea at least - Soni

      // Return or update avatar based on command
      if (command === "fetch") return avatar;
      return await profiledata(["edit", steamid, "avatar", avatar], context);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
