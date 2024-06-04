const UtilError = require("./error.js");

const users = require("./users.js");
const { createHash } = require("crypto");

module.exports = async function (args, context = epochtal) {

  const [command, name, password, steamid] = args;

  const file = context.file.lobbies;
  const lobbies = context.data.lobbies;

  switch (command) {

    case "list": {

      return lobbies.list;

    }

    case "get": {
      
      if (!(name in lobbies.list)) throw new UtilError("ERR_NAME", args, context);
      return lobbies.list[name];

    }

    case "getdata": {

      if (!(name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      return lobbies.data[name];

    }

    case "create": {

      const cleanName = name.trim();
      if (!cleanName || cleanName.length > 50) throw new UtilError("ERR_NAME", args, context);
      if (cleanName in lobbies.list || cleanName in lobbies.data) throw new UtilError("ERR_EXISTS", args, context);

      const hashedPassword = createHash("sha256").update(password).digest("base64");

      lobbies.list[cleanName] = {
        players: [],
        mode: "ffa"
      };
      lobbies.data[cleanName] = {
        password: password ? hashedPassword : false
      };
      if (file) Bun.write(file, JSON.stringify(lobbies));
      
      return;

    }

    case "join": {

      const user = await users(["get", steamid], context);
      if (!user) throw new UtilError("ERR_STEAMID", args, context);

      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      if (lobbies.data[name].password && lobbies.data[name].password !== password) throw new UtilError("ERR_PASSWORD", args, context);
      if (lobbies.list[name].players.includes(steamid)) throw new UtilError("ERR_EXISTS", args, context);

      lobbies.list[name].players.push(steamid);
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
