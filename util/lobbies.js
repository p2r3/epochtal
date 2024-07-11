const UtilError = require("./error.js");

const users = require("./users.js");
const events = require("./events.js");
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

      const listEntry = {
        players: [],
        mode: "ffa"
      };
      const dataEntry = {
        password: password ? hashedPassword : false,
        map: null
      };

      lobbies.list[cleanName] = listEntry;
      lobbies.data[cleanName] = dataEntry;

      if (file) Bun.write(file, JSON.stringify(lobbies));

      const auth = steamid => listEntry.players.includes(steamid);
      const disconnect = async function (steamid) {

        const index = listEntry.players.indexOf(steamid);
        if (index !== -1) listEntry.players.splice(index, 1);

        let lobbyName;
        for (const name in lobbies.list) {
          if (lobbies.list[name] === listEntry) {
            lobbyName = name;
            break;
          }
        }

        const eventName = "lobby_" + lobbyName;
        await events(["send", eventName, { type: "lobby_leave", steamid }], context);

        if (listEntry.players.length === 0) {
          delete lobbies.list[lobbyName];
          delete lobbies.data[lobbyName];

          await events(["delete", eventName], context);

          if (file) Bun.write(file, JSON.stringify(lobbies));
        }

      };

      await events(["create", "lobby_" + cleanName, auth, null, null, disconnect], context);

      return "SUCCESS";

    }

    case "join": {

      const user = await users(["get", steamid], context);
      if (!user) throw new UtilError("ERR_STEAMID", args, context);

      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      if (lobbies.data[name].password && lobbies.data[name].password !== password) throw new UtilError("ERR_PASSWORD", args, context);
      if (lobbies.list[name].players.includes(steamid)) throw new UtilError("ERR_EXISTS", args, context);

      lobbies.list[name].players.push(steamid);
      if (file) Bun.write(file, JSON.stringify(lobbies));

      await events(["send", "lobby_" + name, { type: "lobby_join", steamid }], context);

      return "SUCCESS";

    }

    case "rename": {

      const newName = args[2].trim();

      if (newName in lobbies.list || newName in lobbies.data) throw new UtilError("ERR_EXISTS", args, context);
      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      if (!newName || newName.length > 50) throw new UtilError("ERR_NEWNAME", args, context);

      const listEntry = lobbies.list[name];
      const dataEntry = lobbies.data[name];

      delete lobbies.list[name];
      delete lobbies.data[name];

      lobbies.list[newName] = listEntry;
      lobbies.data[newName] = dataEntry;

      // Brodcast name change to clients
      const eventName = "lobby_" + name;
      await events(["send", eventName, { type: "lobby_name", newName }], context);
      await events(["rename", eventName, "lobby_" + newName], context);

      if (file) Bun.write(file, JSON.stringify(lobbies));
      return "SUCCESS";

    }

    case "password": {

      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);

      const hashedPassword = createHash("sha256").update(password).digest("base64");
      lobbies.data[name].password = password ? hashedPassword : false;

      if (file) Bun.write(file, JSON.stringify(lobbies));
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
