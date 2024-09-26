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
      leaderboard: {
        ffa: []
      },
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

      // Remove passwords from logs
      args[2] = "********";

      // Ensure the name is valid
      const cleanName = name.trim();
      if (!cleanName || cleanName.length > 50) throw new UtilError("ERR_NAME", args, context);
      if (cleanName in lobbies.list || cleanName in lobbies.data) throw new UtilError("ERR_EXISTS", args, context);

      // Create a new lobby and data
      const hashedPassword = password && await Bun.password.hash(password);

      const listEntry = {
        players: [],
        mode: "ffa"
      };
      const dataEntry = {
        password: password ? hashedPassword : false,
        players: {},
        state: LOBBY_IDLE,
        context: createLobbyContext(cleanName)
      };

      lobbies.list[cleanName] = listEntry;
      lobbies.data[cleanName] = dataEntry;

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      // Authenticate only those clients who are in the lobby
      const auth = steamid => listEntry.players.includes(steamid);

      // Handle incoming messages from clients
      const message = async function (message, ws) {

        const { steamid } = ws.data;
        const data = JSON.parse(message);

        // Find the lobby name // TODO: Ideally, we'd reference by some ID, not name.
        let lobbyName;
        for (const name in lobbies.list) {
          if (lobbies.list[name] === listEntry) {
            lobbyName = name;
            break;
          }
        }

        switch (data.type) {

          // Distinguishes browser clients from game clients
          // Game clients are expected to send this right after authenticating
          case "isGame": {
            // Link the socket to the player data
            dataEntry.players[steamid].gameSocket = ws;
            // Broadcast game client join to all lobby clients
            await events(["send", "lobby_" + lobbyName, { type: "lobby_join_game", steamid }], context);
            return;
          }

          // Returned by game clients as a response to the server's query
          case "getMap": {
            dataEntry.players[steamid].getMapCallback(data.value);
            delete dataEntry.players[steamid].getMapCallback;
            return;
          }

          // Returned by game clients to indicate run completion
          case "finishRun": {

            // Reject the response if we're not in-game
            if (dataEntry.state !== LOBBY_INGAME) return;

            const { time, portals } = data.value;

            // Submit this run to the lobby leaderboard
            await leaderboard(["add", listEntry.mode, steamid, time, "", portals], dataEntry.context);
            // Broadcast submission to all lobby clients
            await events(["send", "lobby_" + lobbyName, { type: "lobby_submit", value: { time, portals, steamid } }], context);
            // Change the client's ready state to false
            await module.exports(["ready", lobbyName, false, steamid, true], context);

            return;
          }

        }

      };

      // Handle clients disconnecting and close lobby if empty
      const disconnect = async function (ws) {

        const { steamid } = ws.data;

        // If this is a game client, just change their ready state to false and exit
        if (dataEntry.players[steamid].gameSocket === ws) {
          delete dataEntry.players[steamid].gameSocket;
          await module.exports(["ready", cleanName, false, steamid, true], context);
          return;
        }

        // Disconnect the connected game client (if any) for this player
        if (dataEntry.players[steamid].gameSocket) {
          dataEntry.players[steamid].gameSocket.close(1001, "LOBBY_LEAVE");
        }

        // Remove the player from the lobby
        const index = listEntry.players.indexOf(steamid);
        if (index !== -1) listEntry.players.splice(index, 1);
        delete dataEntry.players[steamid];

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
      await events(["create", "lobby_" + cleanName, auth, message, null, disconnect], context);

      return "SUCCESS";

    }

    case "join": {

      // Remove passwords from logs
      args[2] = "********";

      // Ensure the user and lobby exist
      const user = await users(["get", steamid], context);
      if (!user) throw new UtilError("ERR_STEAMID", args, context);

      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);
      if (lobbies.data[name].password && !(await Bun.password.verify(password, lobbies.data[name].password))) throw new UtilError("ERR_PASSWORD", args, context);
      if (lobbies.list[name].players.includes(steamid)) throw new UtilError("ERR_EXISTS", args, context);

      // Add the player to the lobby
      lobbies.list[name].players.push(steamid);
      lobbies.data[name].players[steamid] = {};

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

      // Remove passwords from logs
      args[2] = "********";

      // Ensure the lobby exists
      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);

      // Set the lobby password
      const hashedPassword = password && await Bun.password.hash(password);
      lobbies.data[name].password = password ? hashedPassword : false;

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "map": {

      const mapid = args[2];

      // Ensure the lobby exists
      if (!(name in lobbies.list && name in lobbies.data)) throw new UtilError("ERR_NAME", args, context);

      // Check if the map provided is currently being played in the weekly tournament
      // The loose equality check here is intentional, as either ID might in rare cases be a number
      if (mapid == epochtal.data.week.map.id) throw new UtilError("ERR_WEEKMAP", args, context);

      // We forge the map entry from a raw workshop request to extract only what we need
      const details = await workshopper(["get", mapid, true]);

      const newMap = {
        id: mapid,
        title: details.title,
        thumbnail: details.preview_url,
        link: details.file_url
      };

      // Fetch the map author's username
      try {
        const authorRequest = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${details.creator}`);
        const authorData = await authorRequest.json();
        newMap.author = authorData.response.players[0].personaname;
      } catch {
        throw new UtilError("ERR_STEAMID", args, context);
      }

      // Get the path to which the map is saved when subscribed to
      const pathWorkshop = details.file_url.split("/ugc/").pop().split("/")[0];
      const pathBSP = details.filename.split("/").pop().slice(0, -4);
      newMap.file = `workshop/${pathWorkshop}/${pathBSP}`;

      // Set the lobby map
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

      // Get the player's lobby data
      const playerData = lobbies.data[name].players[steamid];

      if (readyState) {

        // Throw ERR_NOMAP if the lobby has no map set
        if (lobbies.data[name].context.data.map === null) throw new UtilError("ERR_NOMAP", args, context);

        // Check if the player's game client is connected
        const gameSocket = playerData.gameSocket;
        if (!gameSocket) throw new UtilError("ERR_GAMEAUTH", args, context);

        // Ensure that the player has the map file
        const mapFile = lobbies.data[name].context.data.map.file;
        const mapLink = lobbies.data[name].context.data.map.link;
        gameSocket.send(JSON.stringify({ type: "getMap", value: { file: mapFile, link: mapLink } }));

        // Handle the response to our getMap request
        // The response will be one of: [ 1 - has map; 0 - downloading; -1 - download failure ]
        let hasMapTimeout = null;
        const hasMapCode = await new Promise(function (resolve, reject) {

          // Set up a callback function for the request
          playerData.getMapCallback = val => resolve(val);

          // Stop waiting for a response after 10 seconds
          hasMapTimeout = setTimeout(function () {
            delete playerData.getMapCallback;
            reject(new UtilError("ERR_TIMEOUT", args, context));
          }, 10000);

        });
        if (hasMapTimeout) clearTimeout(hasMapTimeout);

        // Handle the response from the client
        switch (hasMapCode) {

          // If the player already has the map, do nothing and continue
          case 1: break;
          // If the download was attempted but failed, throw ERR_MAP
          case -1: throw new UtilError("ERR_MAP", args, context);

          // If the player has started the download, broadcast this and wait
          case 0: {

            // Broadcast the start of the download
            await events(["send", "lobby_" + name, { type: "lobby_download_start", steamid }], context);

            // Wait for another response from the client indicating success (1) or failure (-1)
            const downloadMapCode = await new Promise(function (resolve, reject) {
              // Set up a callback function for the request
              playerData.getMapCallback = val => resolve(val);
            });

            // Broadcast the end of the download
            await events(["send", "lobby_" + name, { type: "lobby_download_end", steamid }], context);

            // If the download was successful, do nothing and continue
            if (downloadMapCode === 1) break;
            // If the download was attempted but failed, throw ERR_MAP
            throw new UtilError("ERR_MAP", args, context);

          }

          // If the response was something other than expected, throw ERR_MAP
          default: throw new UtilError("ERR_MAP", args, context);

        }

        // Set the player's ready state to true
        playerData.ready = true;

        // If everyone's ready, start the game
        let everyoneReady = true;
        for (const curr in lobbies.data[name].players) {
          if (!lobbies.data[name].players[curr].ready) {
            everyoneReady = false;
            break;
          }
        }
        if (everyoneReady) {
          lobbies.data[name].state = LOBBY_INGAME;
          await events(["send", "lobby_" + name, { type: "lobby_start", map: mapFile }], context);
        }

      } else {

        // Set the player's ready state to false
        playerData.ready = false;

        // If no one is ready, reset the lobby state
        let nobodyReady = true;
        for (const curr in lobbies.data[name].players) {
          if (lobbies.data[name].players[curr].ready) {
            nobodyReady = false;
            break;
          }
        }
        if (nobodyReady) {
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
