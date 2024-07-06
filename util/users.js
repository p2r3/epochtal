const UtilError = require("./error.js");
const UtilPrint = require("./print.js");

const fs = require("node:fs");
const keys = require("../../keys.js");
const avatar = require("./avatar.js");
const profiledata = require("./profiledata.js");

module.exports = async function (args, context = epochtal) {

  const [command, steamid] = args;

  const file = context.file.users;
  const users = context.data.users;
  const profiles = context.file.profiles;

  switch (command) {

    case "list": {

      return users;

    }

    case "find": {

      const output = {};

      // Here, "steamid" is the search query
      for (const curr in users) {
        if (users[curr].name.toLowerCase().includes(steamid.toLowerCase())) {
          output[users[curr].name] = curr;
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

      const [name, avatar] = args.slice(2);
      if (!name) throw new UtilError("ERR_NAME", args, context);

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

      if (key === undefined || value === undefined) {
        throw new UtilError("ERR_ARGS", args, context);
      }

      if (value === "true") value = true;
      else if (value === "false") value = false;

      users[steamid][key] = value;

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "authupdate": {

      const authuser = args[2];

      if (!authuser) throw new UtilError("ERR_ARGS", args, context);
      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

      await profiledata(["edit", steamid, "avatar", authuser.avatar.medium]);
      users[steamid].name = authuser.username;

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "apiupdate": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

      const apiRequest = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2?key=${keys.steam}&steamids=${steamid}`);
      if (apiRequest.status !== 200) throw new UtilError("ERR_STEAMAPI", args, context);

      let player;
      try {
        const requestJSON = await apiRequest.json();
        player = requestJSON.response.players[0];
      } catch (e) {
        throw new UtilError("ERR_STEAMAPI: " + e.message, args, context, "avatar", e.stack);
      }

      if (player !== undefined) {
        await profiledata(["edit", steamid, "avatar", player.avatarmedium]);
        users[steamid].name = player.personaname;
      } else {
        UtilPrint(`Warning: User ${steamid} has no Steam profile, no changes made.`);
      }

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "cleanup": {

      for (const steamid in users) {
        delete users[steamid].banned;
        delete users[steamid].runs;
        users[steamid].points = null;
      }

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
