const UtilError = require("./error.js");
const UtilPrint = require("./print.js");

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
        await Bun.write(dataPath, JSON.stringify(profile));
      }

      return "SUCCESS";
      
    }
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
