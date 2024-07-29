const UtilError = require("./error.js");

const profiledata = require("./profiledata.js");

/**
 * Handles the `avatar` utility call. This utility is used to interact with player avatars.
 *
 * - `get`: Get the locally stored avatar of the user specified in `args[1]`.
 * - `update/fetch`: Update the profile or simply fetch the avatar for the user specified in `args[1]`.
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
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
      const apiRequest = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2?key=${process.env.STEAM_API_KEY}&steamids=${steamid}`);
      if (apiRequest.status !== 200) throw new UtilError("ERR_STEAMAPI", args, context);

      // Try to get the medium avatar from the API response
      let avatar;
      try {
        avatar = (await apiRequest.json()).response.players[0].avatarmedium;
      } catch (e) {
        throw new UtilError("ERR_STEAMAPI: " + e.message, args, context, "avatar", e.stack);
      }

      // > In my opinion it would be cleaner to break out this switch branch (up until this point) into its own function,
      // > and individually call the function in the "update" and "fetch" branches. This way, you wouldn't need to check
      // > "command" twice, does that make sense? It's probably up to preference but there's an idea at least
      // - Soni

      // Return or update avatar based on command
      if (command === "fetch") return avatar;
      return await profiledata(["edit", steamid, "avatar", avatar], context);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
