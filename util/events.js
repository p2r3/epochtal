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

      events.server.publish(name, JSON.stringify(data));

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

    case "delete": {

      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      delete events[name];

      return "SUCCESS";

    }

    case "wshandler": {

      switch (name) {

        case "open": return function (ws) {

          const name = ws.data.event;
          const event = context.data.events[ws.data.event];
          if (!event) return;

          try {
            ws.subscribe(ws.data.event);
            event.connect(ws.data.steamid);
          } catch (err) {
            throw new UtilError("ERR_HANDLER", args, context);
          }

        };

        case "message": return function (ws, message) {

          const name = ws.data.event;
          const event = context.data.events[ws.data.event];
          if (!event) return;

          try {
            context.data.events[ws.data.event].message(message);
          } catch (err) {
            throw new UtilError("ERR_HANDLER", args, context);
          }

        };

        case "close": return function (ws) {

          try {
            ws.unsubscribe(ws.data.event);
            context.data.events[ws.data.event].disconnect(ws.data.steamid);
          } catch (err) {
            throw new UtilError("ERR_HANDLER", args, context);
          }

        };

      }

      throw new UtilError("ERR_NAME", args, context);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};