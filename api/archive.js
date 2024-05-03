const archive = require("../util/archive.js");

module.exports = async function (args, request) {

  const [command, name] = args;

  switch (command) {

    case "list": {
    
      return archive(["list"]);
    
    }

    case "leaderboard":
    case "config": {

      const context = await archive(["get", name]);
      if (!context) return "ERR_NAME";

      if (command === "leaderboard") return context.data.leaderboard;
      return context.data.week;

    }

    case "demo": {

      const [steamid, category] = args.slice(2);
      if (!steamid || !category) return "ERR_ARGS";

      return Response(await archive(["demo", name, steamid, category]));

    }

  }

  return "ERR_COMMAND";

};
