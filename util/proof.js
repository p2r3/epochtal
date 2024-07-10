const UtilError = require("./error.js");

const fs = require("node:fs");
const categories = require("./categories.js");

module.exports = async function (args, context = epochtal) {

  const [command, steamid, category] = args;

  const demos = context.file.demos;
  const users = context.data.users;

  switch (command) {

    case "type":
    case "file": {

      if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);
      // This will throw if the category doesn't exist
      await categories(["get", category], context);

      const demoPath = `${demos}/${steamid}_${category}.dem.xz`;
      const linkPath = `${demos}/${steamid}_${category}.link`;

      if (fs.existsSync(demoPath)) return command === "type" ? "demo" : demoPath;
      if (fs.existsSync(linkPath)) return command === "type" ? "video" : linkPath;

      return null;

    }
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
