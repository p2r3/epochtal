const UtilError = require("./error.js");

/**
 * Handles the `events` utility call. This utility is used to manage websocket events.
 *
 * The following subcommands are available:
 * - `create`: Create a new event
 * - `get`: Get an existing event
 * - `list`: List all events
 * - `send`: Send a message to an event
 * - `rename`: Rename an event
 * - `delete`: Delete an event
 * - `wshandler`: Get a websocket handler for events
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string[]|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, name, data] = args;

  // Grab events from the context
  const events = context.data.events;

  switch (command) {

    case "create": {

      // Ensure name is valid and does not already exist
      if (!name) throw new UtilError("ERR_NAME", args, context);
      if (name in events) throw new UtilError("ERR_EXISTS", args, context);

      const [auth, message, connect, disconnect] = args.slice(2);

      // Create the event
      events[name] = {
        auth: auth || (x => true),
        message: message || (x => undefined),
        connect: connect || (x => undefined),
        disconnect: disconnect || (x => undefined)
      };

      return "SUCCESS";

    }

    case "get": {

      // Return the event if it exists
      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);

      return events[name];

    }

    case "list": {

      return Object.keys(events);

    }

    case "send": {

      // Ensure name and data are valid
      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      if (data === undefined) throw new UtilError("ERR_DATA", args, context);

      // Publish the message to the event
      events.server.publish(name, JSON.stringify(data));

      return "SUCCESS";

    }

    case "rename": {

      // Ensure name is valid and does not already exist
      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);

      const newName = args[2].trim();
      if (newName in events) throw new UtilError("ERR_EXISTS", args, context);

      // Rename the event
      events[newName] = events[name];
      delete events[name];

      return "SUCCESS";

    }

    case "delete": {

      // Delete the event if it exists
      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      delete events[name];

      return "SUCCESS";

    }

    case "wshandler": {

      // Handle websocket events
      switch (name) {

        case "open": return function (ws) {

          // > I may be a little bit confused here,
          // > but isn't the declaration of `name` completely useless and redundant?
          // - PancakeTAS

          // Grab event of websocket
          const name = ws.data.event; // FIXME: Unused variable
          const event = context.data.events[ws.data.event];
          if (!event) return;

          // Authenticate the websocket
          try {
            ws.subscribe(ws.data.event);
            event.connect(ws.data.steamid);
          } catch (err) {
            throw new UtilError("ERR_HANDLER", args, context);
          }

        };

        case "message": return function (ws, message) {

          // Grab event of websocket
          const name = ws.data.event; // FIXME: Unused variable
          const event = context.data.events[ws.data.event];
          if (!event) return;

          // Send message to the event
          try {
            context.data.events[ws.data.event].message(message);
          } catch (err) {
            throw new UtilError("ERR_HANDLER", args, context);
          }

        };

        case "close": return function (ws) {

          // Unsubscribe the websocket
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
