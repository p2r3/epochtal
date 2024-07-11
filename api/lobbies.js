const { createHash } = require("crypto");

const lobbies = require("../util/lobbies.js");
const api_users = require("./users.js");

module.exports = async function (args, request) {

  const [command, name, password] = args;

  switch (command) {

    case "list": {

      return await lobbies(["list"]);

    }

    case "create": {

      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      await lobbies(["create", name, password]);

      const hashedPassword = createHash("sha256").update(password).digest("base64");
      await lobbies(["join", name, hashedPassword, user.steamid]);
      
      return "SUCCESS";

    }

    case "join": {

      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      if (password) {
        const hashedPassword = createHash("sha256").update(password).digest("base64");
        await lobbies(["join", name, hashedPassword, user.steamid]);
      } else {
        await lobbies(["join", name, false, user.steamid]);
      }

      return "SUCCESS";

    }

    case "secure": {

      const password = (await lobbies(["getdata", name])).password;

      if (password) return true;
      return false;

    }

    case "get": {

      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      const listEntry = await lobbies(["get", name]);
      if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

      const data = await lobbies(["getdata", name]);

      return { listEntry, data };

    }

    case "rename": {

      const newName = args[2];

      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      const listEntry = await lobbies(["get", name]);
      if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

      return lobbies(["rename", name, newName]);

    }

    case "password": {

      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      const listEntry = await lobbies(["get", name]);
      if (!listEntry.players.includes(user.steamid)) return "ERR_PERMS";

      return lobbies(["password", name, password]);

    }

  }

  return "ERR_COMMAND";

};
