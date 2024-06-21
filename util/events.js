const UtilError = require("./error.js");

module.exports = async function (args, context = epochtal) {

  const [command, name, data] = args;

  const events = context.data.events;

  switch (command) {
    
    case "create": {

      if (!name) throw new UtilError("ERR_NAME", args, context);
      if (name in events) throw new UtilError("ERR_EXISTS", args, context);

      const authFunction = args[2];

      events[name] = {
        controllers: [],
        auth: authFunction || false
      };

      return "SUCCESS";

    }

    case "get": {

      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      
      return events[name];

    }

    case "send": {

      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      if (!data) throw new UtilError("ERR_ARGS", args, context);

      for (let i = 0; i < events[name].controllers.length; i ++) {
        events[name].controllers[i].enqueue(`data: ${JSON.stringify(data)}\n\n`);
      }
      
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};