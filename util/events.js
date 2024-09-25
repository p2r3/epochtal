const UtilError = require("./error.js");

/**
 * Get the event data from an authentication token
 *
 * @param {string} token The authentication token
 * @param {object} context An Epochtal context object
 * @returns {object|null} The event data
 */
async function getDataFromToken (token, context = epochtal) {

  // Iterate through every event looking for the given token
  for (const name in context.data.events) {

    const event = context.data.events[name];

    // Look for a matching hash
    // Tokens are treated as passwords, and thus have to be verified with Bun.password
    let foundHash = null;
    for (const hash in event.tokens) {
      if (await Bun.password.verify(token, hash)) {
        foundHash = hash;
        break;
      }
    }
    if (!foundHash) continue;

    // Once the token is found, clear it from the event and return data
    const steamid = event.tokens[foundHash];
    delete event.tokens[foundHash];
    return { steamid, event: name };

  }

  // Return null if the token doesn't correspond to an event
  return null;

}

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
        auth: auth || (() => true),
        message: message || (() => undefined),
        connect: connect || (() => undefined),
        disconnect: disconnect || (() => undefined),
        tokens: {}
      };

      return "SUCCESS";

    }

    case "get": {

      // Return the event if it exists
      if (!(name in events)) return null;
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

    case "addtoken": {

      const [token, steamid] = args.slice(2);
      args[2] = "********"; // Remove tokens from logs

      // Check if the event exists
      if (!(name in events)) throw new UtilError("ERR_NAME", args, context);
      // Check if a token was provided
      if (!token) throw new UtilError("ERR_TOKEN", args, context);

      // Hash the given token before saving it
      const hash = await Bun.password.hash(token);
      events[name].tokens[hash] = steamid;

      // Expire the token after 30 seconds
      setTimeout(function () {
        if (!(name in events)) return;
        if (!("tokens" in events[name])) return;
        delete events[name].tokens[hash];
      }, 30000);

      return "SUCCESS";

    }

    case "wshandler": {

      // Handle websocket events
      switch (name) {

        // We don't govern the opening of new sockets
        // Instead, authentication is handled when the first message is received
        case "open": return () => undefined;

        case "message": return async function (ws, message) {

          // If no data is set for the socket, assume this is the first message
          // The first message contains the token - get the event data from it
          if (!("event" in ws.data)) {

            // Verify token
            const token = message.trim();
            const data = await getDataFromToken(token, context);
            if (!data) return ws.close(1008, "ERR_TOKEN");

            // Attach the event data to the websocket
            ws.data = data;

            // Subscribe the websocket and call the event's connect handler
            ws.subscribe(data.event);
            await context.data.events[data.event].connect(ws);

            // Send acknowledgement
            ws.send(JSON.stringify({ type: "authenticated" }));
            return;

          }

          // Grab event of websocket
          const event = context.data.events[ws.data.event];
          if (!event) return;

          // Send message to the event
          try {
            await event.message(message, ws);
          } catch {
            new UtilError("ERR_HANDLER", args, context);
          }

        };

        case "close": return async function (ws) {

          // Grab event of websocket
          const event = context.data.events[ws.data.event];
          if (!event) return;

          // Unsubscribe the websocket
          try {
            ws.unsubscribe(ws.data.event);
            await event.disconnect(ws);
          } catch {
            new UtilError("ERR_HANDLER", args, context);
          }

        };

      }

      throw new UtilError("ERR_NAME", args, context);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};