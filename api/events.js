const events = require("../util/events.js");

const api_users = require("./users.js");

/**
 * Handles `/api/events/` endpoint requests. This event supports the following commands:
 *
 * - `auth`: Checks the user's permissions for the given event and returns an auth token
 * - `connect`: Upgrades the connection to a WebSocket, awaits authentication
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {object} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, event] = args;

  switch (command) {

    case "auth": {

      // Check if the given event exists
      const eventData = await events(["get", event]);
      if (!eventData) return Response("ERR_NAME", { status: 404 });

      // Make sure the user is logged in
      const user = await api_users(["whoami"], request);
      if (!user) return Response("ERR_LOGIN", { status: 403 });

      // Check if the user has permission to access the event
      if (!(await eventData.auth(user.steamid))) {
        return Response("ERR_PERMS", { status: 403 });
      }

      // Calculate a unique auth token
      const token = Bun.hash(event).toString(36) + Math.random().toString(36).substring(2) + Date.now().toString(36);
      await events(["addtoken", event, token, user.steamid]);

      return token;

    }

    case "connect": {

      // Upgrade the connection to a WebSocket
      if (epochtal.data.events.server.upgrade(request, { data: { } })) return;
      return new Response("ERR_PROTOCOL", { status: 500 });

    }

  }

  return "ERR_COMMAND";

};
