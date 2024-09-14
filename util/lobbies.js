const UtilError = require("./error.js");

const users = require("./users.js");
const events = require("./events.js");
const workshopper = require("./workshopper.js");
const { createHash } = require("crypto");

/**
 * Handles the `lobbies` utility call. This utility is used to manage game lobbies.
 *
 * The following subcommands are available:
 * - `list`: List all lobbies
 * - `get`: Get a lobby
 * - `getdata`: Get lobby data
 * - `create`: Create a new lobby
 * - `join`: Join a lobby
 * - `rename`: Rename a lobby
 * - `password`: Set a lobby password
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string[]|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, name, password, steamid] = args;

  const file = context.file.lobbies;
  const lobbies = context.data.lobbies;

  switch (command) {

    case "list": {

      // Return a list of all lobbies
      return lobbies.list;

    }

    case "get": {

      // Return a lobby if it exists
      if (!(name in lobbies.list)) throw new UtilError("ERR_NAME", args, context);
      return lobbies.list[name];

    }

    case "getdata": {

      // Return lobby data if it exists
      if (!(name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      return lobbies.data[name];

    }

    case "create": {

      // Ensure the name is valid
      const cleanName = name.trim();
      if (!cleanName || cleanName.length > 50) throw new UtilError("ERR_NAME", args, context);
      if (cleanName in lobbies.list || cleanName in lobbies.data) throw new UtilError("ERR_EXISTS", args, context);

      // Create a new lobby and data
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

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      // Create the event handlers for the lobby
      const auth = steamid => listEntry.players.includes(steamid);
      const disconnect = async function (steamid) {

        // Remove the player from the lobby
        const index = listEntry.players.indexOf(steamid);
        if (index !== -1) listEntry.players.splice(index, 1);

        // Find the lobby name
        let lobbyName;
        for (const name in lobbies.list) {
          if (lobbies.list[name] === listEntry) {
            lobbyName = name;
            break;
          }
        }

        // Brodcast the leave to clients
        const eventName = "lobby_" + lobbyName;
        await events(["send", eventName, { type: "lobby_leave", steamid }], context);

        // Delete the lobby if it is empty
        if (listEntry.players.length === 0) {
          delete lobbies.list[lobbyName];
          delete lobbies.data[lobbyName];

          await events(["delete", eventName], context);

          if (file) Bun.write(file, JSON.stringify(lobbies));
        }

      };

      // Create the lobby creation event
      await events(["create", "lobby_" + cleanName, auth, null, null, disconnect], context);

      return "SUCCESS";

    }

    case "join": {

      // Ensure the user and lobby exist
      const user = await users(["get", steamid], context);
      if (!user) throw new UtilError("ERR_STEAMID", args, context);

      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      if (lobbies.data[name].password && lobbies.data[name].password !== password) throw new UtilError("ERR_PASSWORD", args, context);
      if (lobbies.list[name].players.includes(steamid)) throw new UtilError("ERR_EXISTS", args, context);

      // Add the player to the lobby
      lobbies.list[name].players.push(steamid);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      // Brodcast the join to clients
      await events(["send", "lobby_" + name, { type: "lobby_join", steamid }], context);

      return "SUCCESS";

    }

    case "rename": {

      const newName = args[2].trim();

      // Ensure the new name is valid
      if (newName in lobbies.list || newName in lobbies.data) throw new UtilError("ERR_EXISTS", args, context);
      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      if (!newName || newName.length > 50) throw new UtilError("ERR_NEWNAME", args, context);

      // Rename the lobby
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

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "password": {

      // Ensure the lobby exists
      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);

      // Set the lobby password
      const hashedPassword = createHash("sha256").update(password).digest("base64");
      lobbies.data[name].password = password ? hashedPassword : false;

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "map": {

      const mapid = args[2];

      // Ensure the lobby exists
      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);

      // Set the lobby map
      const newMap = await workshopper(["get", mapid]);
      lobbies.data[name].map = newMap;

      // Brodcast map change to clients
      const eventName = "lobby_" + name;
      await events(["send", eventName, { type: "lobby_map", newMap }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
