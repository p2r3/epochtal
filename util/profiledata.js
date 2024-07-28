const UtilError = require("./error.js");

const fs = require("node:fs");

/**
 * Handles the `profiledata` utility call. This is used to get or modify a user's profile data.
 *
 * The following subcommands are available:
 * - `get`: Get the profile of the user with the provided SteamID. Throws ERR_STEAMID if the user does not exist.
 * - `flush`: Write profile data of the specified user to disk. Throws ERR_STEAMID if the user does not exist.
 * - `edit`: Write the specified key (`args[2]`) and value (`args[3]`) to the user with the provided SteamID. Then flush
 * the changes.
 * - `forceadd`/`add`: Create a profile with the provided SteamID. Uses `args[2]` as the user avatar. Throws ERR_EXISTS
 * if the profile already exists, unless using the `forceadd` subcommand.
 * - `remove`: Delete the profile at the provided SteamID. Throws ERR_STEAMID if the user does not exist.
 *
 * @param args The arguments for the call. `args[1]` should contain the appropriate SteamID.
 * @param context The context on which to execute the call (defaults to epochtal)
 * @returns {Promise<*|string>} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, steamid, key, value] = args;

  const profiles = context.data.profiles;
  const profilesPath = context.file.profiles;

  switch (command) {

    case "get": {

      if (!(steamid in profiles)) throw new UtilError("ERR_STEAMID", args, context);
      return profiles[steamid];

    }

    case "flush":
    case "edit": {

      if (!(steamid in profiles)) throw new UtilError("ERR_STEAMID", args, context);

      const profile = profiles[steamid];
      if (command === "edit") profile[key] = value;

      if (profilesPath) {
        const dataPath = `${profilesPath}/${steamid}/data.json`;
        await Bun.write(dataPath, JSON.stringify(profile));
      }

      return "SUCCESS";

    }

    case "forceadd":
    case "add": {

      if (steamid in profiles && command !== "forceadd") {
        throw new UtilError("ERR_EXISTS", args, context);
      }

      const avatar = args[2] || "/icons/unknown.jpg";

      const profile = {
        banned: false,
        avatar: avatar,
        categories: [],
        statistics: [],
        weeks: []
      };
      profiles[steamid] = profile;

      if (profilesPath) {
        const dataPath = `${profilesPath}/${steamid}/data.json`;
        await Bun.write(dataPath, JSON.stringify(profile));
      }

      return "SUCCESS";

    }

    case "remove": {

      if (!(steamid in profiles)) throw new UtilError("ERR_STEAMID", args, context);

      delete profiles[steamid];

      if (profilesPath) {
        const dataPath = `${profilesPath}/${steamid}/data.json`;
        if (fs.existsSync(dataPath)) await fs.unlinkSync(dataPath);
      }

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
