const UtilError = require("./error.js");

const keys = require("../../keys.js");
const profiledata = require("./profiledata.js");

module.exports = async function (args, context = epochtal) {

  const [command, steamid] = args;

  switch (command) {

    case "get": {

      const profile = await profiledata(["get", steamid], context);
      return profile.avatar;

    }

    case "update":
    case "fetch": {

      const apiRequest = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2?key=${keys.steam}&steamids=${steamid}`);
      if (apiRequest.status !== 200) throw new UtilError("ERR_STEAMAPI", args, context);

      let avatar;
      try {
        avatar = (await apiRequest.json()).response.players[0].avatarmedium;
      } catch (e) {
        throw new UtilError("ERR_STEAMAPI: " + e.message, args, context, "avatar", e.stack);
      }

      if (command === "fetch") return avatar;
      return await profiledata(["edit", steamid, "avatar", avatar], context);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
