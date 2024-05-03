const fs = require("node:fs");
const { $ } = require("bun");

const tmppath = require("../util/tmppath.js");
const demo = require("../util/demo.js");
const discord = require("../util/discord.js");
const leaderboard = require("../util/leaderboard.js");

const api_users = require("./users.js");

module.exports = async function (args, request) {

  const [command, category] = args;

  switch (command) {

    case "get": {
    
      return epochtal.data.leaderboard;
    
    }

    case "submit": {

      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      const note = args[2];
      if (note === undefined) return "ERR_ARGS";
      if (note.length > 200) return "ERR_NOTE";

      const path = (await tmppath()) + ".dem";

      const formData = await request.formData();
      const fileBlob = formData.get("demo");

      if (!(fileBlob instanceof Blob)) return "ERR_FILE";

      await Bun.write(path, fileBlob);

      const verdict = await demo(["verify", path]);
      if (verdict !== "VALID") {
        fs.rmSync(path);

        const reportText = `${user.username}'s run was rejected. ${verdict}\nSteam ID: ${user.steamid}`;
        await discord(["report", reportText]);

        return "ERR_ILLEGAL";
      }

      const data = await demo(["parse", path]);
      
      if (user.steamid !== data.steamid) {
        fs.rmSync(path);
        return "ERR_STEAMID";
      }
      
      const lbadd = await leaderboard(["add", category, data.steamid, data.time, note, data.portals, false]);
      if (lbadd !== "SUCCESS") {
        fs.rmSync(path);
        return lbadd;
      }

      const newPath = `${epochtal.file.demos}/${data.steamid}_${category}.dem`;
      fs.renameSync(path, newPath);
      await $`xz -zf9e ${newPath}`.quiet();

      return data;

    }

    case "submitlink": {

      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      for (let i = 2; i <= 5; i ++) {
        if (args[i] === undefined) return "ERR_ARGS";
      }

      const [link, note, time, portals] = args.slice(2);

      const data = {
        steamid: user.steamid,
        time: time,
        portals: portals
      };

      const lbadd = await leaderboard(["add", category, data.steamid, data.time, note, data.portals, true]);
      if (lbadd !== "SUCCESS") return lbadd;

      const newPath = `${epochtal.file.demos}/${data.steamid}_${category}.link`;
      await Bun.write(newPath, link);

      return data;

    }

  }

  return "ERR_COMMAND";

};
