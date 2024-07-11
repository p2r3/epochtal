const UtilError = require("./error.js");

module.exports = async function (args, context = epochtal) {

  const [command, name, data] = args;

  const events = context.data.events;

  switch (command) {
    
    case "create": {

      if (!name) throw new UtilError("ERR_NAME", args, context);
      if (name in events) throw new UtilError("ERR_EXISTS", args, context);

      const [auth, message, connect, disconnect] = args.slice(2);

      events[name] = {
        auth: auth || (x => true),
        message: message || (x => undefined),
        connect: connect || (x => undefined),
        disconnect: disconnect || (x => undefined)
      };

      return "SUCCESS";

    }

    case "get": {

      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      
      return events[name];

    }

    case "list": {

      return Object.keys(events);

    }

    case "send": {

      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      if (data === undefined) throw new UtilError("ERR_DATA", args, context);

      events.server.publish(name, data);
      
      return "SUCCESS";

    }
    
    case "rename": {

      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);

      const newName = args[2].trim();
      if (newName in events) throw new UtilError("ERR_EXISTS", args, context);

      events[newName] = events[name];
      delete events[name];

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};