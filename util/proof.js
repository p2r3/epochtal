const UtilError = require("./error.js");

const fs = require("node:fs");

module.exports = async function (args, context = epochtal) {

  const [command, steamid, category] = args;

  const demos = context.file.demos;
  const users = context.data.users;

  switch (command) {

    case "type":
    case "file": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);
      if (!(category in context.data.leaderboard)) throw new UtilError("ERR_CATEGORY", args, context);

      const demoPath = `${demos}/${steamid}_${category}.dem.xz`;
      const linkPath = `${demos}/${steamid}_${category}.link`;

      if (fs.existsSync(demoPath)) return command === "type" ? "demo" : demoPath;
      if (fs.existsSync(linkPath)) return command === "type" ? "video" : linkPath;

      return null;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
