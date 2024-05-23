const UtilError = require("./error.js");

module.exports = async function (args, context = epochtal) {

  const [command, user] = args;

  const file = context.file.users;
  const users = context.data.users;

  switch (command) {

    case "list": {

      return users;

    }

    case "find": {

      const output = {};

      for (const steamid in users) {
        if (users[steamid].name.toLowerCase().includes(user.toLowerCase())) {
          output[users[steamid].name] = steamid;
        }
      }

      return output;

    }

    case "get": {
      
      if (!(user in users)) return null;
      return users[user];

    }

    case "add": {

      if (!user) throw new UtilError("ERR_STEAMID", args, context);
      if (user in users) throw new UtilError("ERR_EXISTS", args, context);

      const name = args[2];
      if (!name) throw new UtilError("ERR_NAME", args, context);
      
      users[user] = {
        name: name,
        banned: false,
        points: 0
      };

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "ban": {

      if (!(user in users)) throw new UtilError("ERR_STEAMID", args, context);
      
      const time = args[2];
      if (time === undefined) throw new UtilError("ERR_ARGS", args, context);
      if (isNaN(time)) throw new UtilError("ERR_TIME", args, context);

      users[user].banned = Date.now() + time * 1000;

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "remove": {

      if (!(user in users)) throw new UtilError("ERR_STEAMID", args, context);

      delete users[user];

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "edit": {

      if (!(user in users)) throw new UtilError("ERR_STEAMID", args, context);

      const key = args[2];
      let value = args[3];

      if (key === undefined || value === undefined) {
        throw new UtilError("ERR_ARGS", args, context);
      }

      if (value === "true") value = true;
      else if (value === "false") value = false;

      users[user][key] = value;

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
