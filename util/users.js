const UtilError = require("./error.js");
const UtilPrint = require("./print.js");

const profiledata = require("./profiledata.js");

/**
 * Handles the `users` utility call. This utility is used to interact with the users in the given context.
 *
 * The following subcommands are available:
 * - `list`: Returns all users in the given context.
 * - `find`: Returns any user(s) with the given SteamID in `args[1]`.
 * - `get`: Returns the user with the given SteamID in `args[1]`. Returns `null` if the user does not exist.
 * - `add`: Adds a user with the given SteamID and name starting at `args[1]`. Can optionally also specify user avatar
 * in `args[3]`.
 * - `ban`: Bans the user with the given SteamID for the amount of seconds specified in `args[2]`.
 * - `remove`: Removes the user with the specified SteamID.
 * - `edit`: On the specified user, sets the given key to the given value (`args[2]` and `args[3]` respectively).
 * - `authupdate`: Updates the username and avatar of the specified user with data from the auth user specified in `args[2]`.
 * - `apiupdate`: Updates the username and avatar of the specified user with new data from the Steam API.
 *
 * @param args The arguments for the call
 * @param context The context on which to execute the call (defaults to epochtal)
 * @returns {Promise<{}|*|string|null>} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid] = args;

  const file = context.file.users;
  const users = context.data.users;

  switch (command) {

    case "list": {

      return users;

    }

    case "find": {

      const output = {};

      // Here, "steamid" is the search query
      for (const curr in users) {
        if (users[curr].name.toLowerCase().includes(steamid.toLowerCase())) {
          output[curr] = users[curr].name;
        }
      }

      return output;

    }

    case "get": {

      if (!(steamid in users)) return null;
      return users[steamid];

    }

    case "add": {

      if (!steamid) throw new UtilError("ERR_STEAMID", args, context);
      if (steamid in users) throw new UtilError("ERR_EXISTS", args, context);

      // Get the name and avatar from args, after command and steamid (starts at index 2)
      const [name, avatar] = args.slice(2);
      if (!name) throw new UtilError("ERR_NAME", args, context);

      // Create a profile for the user
      await profiledata(["add", steamid, avatar], context);

      users[steamid] = {
        name: name,
        points: null
      };

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "ban": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

      const time = args[2];
      if (time === undefined) throw new UtilError("ERR_ARGS", args, context);
      if (isNaN(time)) throw new UtilError("ERR_TIME", args, context);

      // Calculate the end timestamp for the ban
      const timestamp = Date.now() + time * 1000;
      await profiledata(["edit", steamid, "banned", timestamp], context);

      return "SUCCESS";

    }

    case "remove": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

      delete users[steamid];
      await profiledata(["remove", steamid], context);

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "edit": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

      const key = args[2];
      let value = args[3];

      // Throw an error if the key or value is invalid
      if (key === undefined || value === undefined) {
        throw new UtilError("ERR_ARGS", args, context);
      }

      // Get boolean values from string
      if (value === "true") value = true;
      else if (value === "false") value = false;

      users[steamid][key] = value;

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "authupdate": {

      // Get the auth user
      const authuser = args[2];

      if (!authuser) throw new UtilError("ERR_ARGS", args, context);
      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

      // Update saved data with data from auth user
      await profiledata(["edit", steamid, "avatar", authuser.avatar.medium]);
      users[steamid].name = authuser.username;

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "apiupdate": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

      // Get data from Steam API
      const apiRequest = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2?key=${process.env.STEAM_API_KEY}&steamids=${steamid}`);
      if (apiRequest.status !== 200) throw new UtilError("ERR_STEAMAPI", args, context);

      // Try to get player data from the response
      let player;
      try {
        const requestJSON = await apiRequest.json();
        player = requestJSON.response.players[0];
      } catch (e) {
        throw new UtilError("ERR_STEAMAPI: " + e.message, args, context, "avatar", e.stack);
      }

      // Update user with name and avatar from Steam
      if (player !== undefined) {
        await profiledata(["edit", steamid, "avatar", player.avatarmedium]);
        users[steamid].name = player.personaname;
      } else {
        UtilPrint(`Warning: User ${steamid} has no Steam profile, no changes made.`);
      }

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
