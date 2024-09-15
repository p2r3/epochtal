const UtilError = require("./error.js");

const users = require("./users.js");
const events = require("./events.js");
const workshopper = require("./workshopper.js");
const leaderboard = require("./leaderboard.js");

const [LOBBY_IDLE, LOBBY_INGAME] = [0, 1];

/**
 * Creates a default context for the lobby.
 * Cointains just enough scaffolding for the required utilities to run.
 *
 * @returns {object} An Epochtal context object
 */
function createLobbyContext (name) {
  return {
    file: {
      log: "/dev/null"
    },
    data: {
      map: null,
      leaderboard: {},
      week: {
        date: Date.now(),
        categories: [
          {
            name: "ffa",
            title: "Free For All",
            portals: false
          }
        ]
      }
    },
    name: "lobby_" + name
  };
}

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
      const hashedPassword = await Bun.password.hash(password);

      const listEntry = {
        players: [],
        mode: "ffa"
      };
      const dataEntry = {
        password: password ? hashedPassword : false,
        ready: [],
        state: LOBBY_IDLE,
        context: createLobbyContext(cleanName)
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

        // Delete the lobby if it is still empty 10 seconds after all players have left
        if (listEntry.players.length === 0) {
          setTimeout(async function () {

            if (listEntry.players.length !== 0) return;

            delete lobbies.list[lobbyName];
            delete lobbies.data[lobbyName];
            if (file) Bun.write(file, JSON.stringify(lobbies));

            try {
              await events(["delete", eventName], context);
            } catch {
              // Prevent a full server crash in case of a race condition
            }

          }, 10000);
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
      if (lobbies.data[name].password && !(await Bun.password.verify(password, lobbies.data[name].password))) throw new UtilError("ERR_PASSWORD", args, context);
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
      const hashedPassword = await Bun.password.hash(password);
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
      lobbies.data[name].context.data.map = newMap;

      // Brodcast map change to clients
      const eventName = "lobby_" + name;
      await events(["send", eventName, { type: "lobby_map", newMap }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "ready": {

      // Ensure that readyState is a boolean
      const readyState = args[2] == true;
      // Whether to force ready state change regardless of lobby state
      const force = args[4];

      // Ensure the lobby exists
      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);

      // Throw ERR_INGAME if the game has already started
      if (!force && lobbies.data[name].state === LOBBY_INGAME) {
        throw new UtilError("ERR_INGAME", args, context);
      }

      if (readyState) {

        // Throw ERR_NOMAP if the lobby has no map set
        if (lobbies.data[name].context.data.map === null) throw new UtilError("ERR_NOMAP", args, context);

        // Check if the player's game client is connected
        try {
          await events(["get", `game_${steamid}`], context);
        } catch {
          throw new UtilError("ERR_GAMEAUTH", args, context);
        }

        // Check if the player has the map file
        // First, connect to the game client event
        const wsProtocol = gconfig.https ? "wss" : "ws";
        const wsAuthSecret = encodeURIComponent(process.env.INTERNAL_SECRET);
        const gameSocket = new WebSocket(`${wsProtocol}://${gconfig.domain}/ws/game_${steamid}?Authentication=${wsAuthSecret}`);

        // Wait for the connection to open
        await new Promise(function (resolve, reject) {
          const openTimeout = setTimeout(function () {
            reject(new UtilError("ERR_GAMESOCKET", args, context));
          }, 5000);
          gameSocket.addEventListener("open", function () {
            clearTimeout(openTimeout);
            resolve();
          });
        });

        // Communicate with the game client to retrieve map state
        hasMapTimeout = null;
        const mapFile = lobbies.data[name].context.data.map.file;
        const hasMap = await new Promise(async function (resolve, reject) {

          // Set up a listener for any echoed checkmap events from the client
          gameSocket.onmessage = function (event) {
            const data = JSON.parse(event.data);
            if (data.type !== "echo") return;

            const echoData = JSON.parse(data.value);
            if (echoData.type !== "checkmap") return;

            gameSocket.onmessage = null;
            resolve(echoData.value);
          };

          // Finally, send a request for the map check
          await events(["send", `game_${steamid}`, { type: "checkmap", value: mapFile }], context);

          // Stop waiting for a response after 15 seconds
          hasMapTimeout = setTimeout(function () {
            gameSocket.onmessage = null;
            reject(new UtilError("ERR_TIMEOUT", args, context));
          }, 15000);

        });
        if (hasMapTimeout) clearTimeout(hasMapTimeout);

        // If the player doesn't have the map, throw ERR_MAP
        if (!hasMap) throw new UtilError("ERR_MAP", args, context);

        // Add the player to the ready list
        if (!lobbies.data[name].ready.includes(steamid)) {
          lobbies.data[name].ready.push(steamid);
        }

        // If everyone's ready, start the game
        if (lobbies.list[name].players.length === lobbies.data[name].ready.length) {

          lobbies.data[name].state = LOBBY_INGAME;

          // Handle each connected game client
          for (const steamid of lobbies.list[name].players) {

            // Keep track of time from before any commands were sent to eliminate impossible responses
            const commandTime = Date.now();
            // Send a "map" command to the client
            await events(["send", `game_${steamid}`, { type: "cmd", value: `map ${mapFile}` }], context);

            // Connect to the game client event
            const gameSocket = new WebSocket(`${wsProtocol}://${gconfig.domain}/ws/game_${steamid}?Authentication=${wsAuthSecret}`);

            // Listen for a message indicating map completion
            gameSocket.onmessage = async function (event) {

              // Ensure we're handling an echoed "finishmap" event
              const data = JSON.parse(event.data);
              if (data.type !== "echo") return;
              const echoData = JSON.parse(data.value);
              if (echoData.type !== "finishmap") return;

              // Check if the run length we received puts us in the future
              if (commandTime + echoData.value.time * (1000 / 60) > Date.now()) return;

              gameSocket.onmessage = null;
              gameSocket.onclose = null;

              // Submit this run to the lobby leaderboard
              await leaderboard(["add", lobbies.list[name].mode, steamid, echoData.value.time, "", echoData.value.portals], lobbies.data[name].context);
              // Broadcast submission to all lobby clients
              await events(["send", "lobby_" + name, { type: "lobby_submit", value: echoData.value }], context);
              // Call this same utility, changing the client's ready state to false
              module.exports(["ready", name, false, steamid, true], context);

            };

            // Handle the socket closing prematurely
            gameSocket.onclose = function () {

              gameSocket.onmessage = null;
              gameSocket.onclose = null;

              // Call this same utility, changing the client's ready state to false
              module.exports(["ready", name, false, steamid, true], context);

            };

          }

        }

      } else {

        // Remove the player from the ready list
        if (lobbies.data[name].ready.includes(steamid)) {
          lobbies.data[name].ready.splice(lobbies.data[name].ready.indexOf(steamid), 1);
        }

        // If no one is ready, reset the lobby state
        if (lobbies.data[name].ready.length === 0) {
          lobbies.data[name].state = LOBBY_IDLE;
        }

      }

      // Brodcast ready state to clients
      const eventName = "lobby_" + name;
      await events(["send", eventName, { type: "lobby_ready", steamid, readyState }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
