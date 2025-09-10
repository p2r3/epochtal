const UtilError = require("./error.js");

const users = require("./users.js");
const events = require("./events.js");
const workshopper = require("./workshopper.js");
const leaderboard = require("./leaderboard.js");

const [LOBBY_IDLE, LOBBY_INGAME] = [0, 1];

// TODO: Store screenshots locally?
const campaignMaps = require("../defaults/maps_sp.json");

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
      maps: [],
      leaderboard: {
        lobby: []
      },
      week: {
        date: Date.now() / 1000,
        categories: [
          {
            name: "lobby",
            title: "Lobby Leaderboard",
            portals: false
          }
        ]
      }
    },
    name: "lobby_" + name
  };
}

/**
 * Handles the lobby state changing by firing events based on the lobby
 * mode, effectively implementing different gamemodes.
 *
 * @param {string} id The lobby's unique ID string
 * @param {object} context The Epochtal context in which the lobby resides
 * @param {boolean} init Whether we're just initializing a mew lobby mode
 */
async function handleStateChange (id, context, init = false) {

  const listEntry = context.data.lobbies.list[id];
  const dataEntry = context.data.lobbies.data[id];

  const { mode } = listEntry;
  const { state } = dataEntry;

  // Delete any round timeouts on state or mode change
  if ("roundTimeout" in dataEntry) {
    clearTimeout(dataEntry.roundTimeout);
    delete dataEntry.roundTimeout;
  }

  // Increment win count of players in first place
  if (state === LOBBY_INGAME) {
    for (const run of dataEntry.context.data.leaderboard.lobby) {
      if (run.placement !== 1) continue;
      if (!(run.steamid in dataEntry.players)) continue;
      dataEntry.players[run.steamid].wins ++;
    }
  }

  switch (mode) {
    case "ffa": break;
    case "random_ranked":
    case "random": {
      if (state === LOBBY_INGAME) break;
      // Pick a random map whenever the lobby becomes idle
      const hidden = mode === "random_ranked";
      try {
        await module.exports(["map", id, "random", hidden], context);
      } catch {
        // If that failed, keep trying on an interval
        // Even we keep throwing, it'll stop on mode change or lobby deletion
        setTimeout(function () {
          handleStateChange(id, context, init).catch(e => { });
        }, 3000);
      }
      break;
    }
    case "cotd": {
      if (state === LOBBY_INGAME) {
        // After starting a round, schedule force-abort in 8 minutes
        dataEntry.roundTimeout = setTimeout(async function () {
          try {
            if (dataEntry.state === LOBBY_IDLE) return;
            await module.exports(["abort", id], context);
            delete dataEntry.roundTimeout;
          } catch { }
        }, 8*60*1000);
      } else if (!init) {
        // After finishing a round, give runners 5 minutes to get ready
        dataEntry.roundTimeout = setTimeout(async function () {
          try {
            if (dataEntry.state === LOBBY_INGAME) return;
            await module.exports(["start", id], context);
            delete dataEntry.roundTimeout;
          } catch { }
        }, 5*60*1000);
      }
      // Fall through to "Battle Royale" case, inheriting its behavior
    }
    case "battle_royale": {
      if (state === LOBBY_INGAME) {
        // Kick players who aren't connected by the time that the game starts
        for (const player in dataEntry.players) {
          if (dataEntry.host === player) continue;
          if (dataEntry.players[player].gameSocket) continue;
          await module.exports(["leave", id, player], context);
        }
        break;
      }
      // Kick players with no time, and the player with the slowest time
      // Don't do this when initializing, because no one has a time then
      if (!init) {
        // Get leaderboard of runs
        const lb = await leaderboard(["get", "lobby"], dataEntry.context);
        // Kick non-hosts without times
        for (const player of listEntry.players) {
          if (lb.find(c => c.steamid === player)) continue;
          if (dataEntry.host === player) continue;
          await module.exports(["leave", id, player], context);
        }
        // Kick slowest player with a time
        const slowest = lb[lb.length - 1].steamid;
        await module.exports(["leave", id, slowest], context);
      }
      // Shrink lobby to smallest size accommodating remaining players
      const playerCount = listEntry.players.length;
      await module.exports(["maxplayers", id, playerCount], context);
      break;
    }
  }

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
 * - `maxplayers`: Set the maximum player count of the lobby
 * - `map`: Set the active lobby map
 * - `mode`: Set the lobby mode
 * - `ready`: Set the ready state of the specified player
 * - `host`: Transfer the host role to the specified player
 * - `leave`: Remove the specified player from the lobby
 * - `start`: Force start the game
 * - `abort`: Force stop the game (everyone is set to "not ready")
 * - `spectate`: Add or remove the given player from the spectators list
 * - `chat`: Send a chat message to be broadcasted within the lobby
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string[]|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, lobbyid, password, steamid] = args;

  const file = context.file.lobbies;
  const lobbies = context.data.lobbies;

  switch (command) {

    case "list": {

      // Return a list of all lobbies
      return lobbies.list;

    }

    case "get": {

      // Return a lobby if it exists
      if (!(lobbyid in lobbies.list)) throw new UtilError("ERR_LOBBYID", args, context);
      return lobbies.list[lobbyid];

    }

    case "getdata": {

      // Return lobby data if it exists
      if (!(lobbyid in lobbies.data)) throw new UtilError("ERR_LOBBYID", args, context);
      return lobbies.data[lobbyid];

    }

    case "create": {

      // Remove passwords from logs
      args[2] = "********";

      // Ensure the name is valid
      const cleanName = args[1].trim();
      if (!cleanName || cleanName.length > 50) throw new UtilError("ERR_NAME", args, context);

      // Generate a unique lobby ID
      const newID = Date.now().toString(36);
      // Generate an event name from the lobby ID
      const eventName = "lobby_" + newID;

      // Create a new lobby and data
      const hashedPassword = password && await Bun.password.hash(password);

      const listEntry = {
        name: cleanName,
        players: [],
        mode: "ffa"
      };
      const dataEntry = {
        password: password ? hashedPassword : false,
        players: {},
        maxplayers: null,
        host: undefined,
        spectators: [],
        crashed: [],
        state: LOBBY_IDLE,
        context: createLobbyContext(cleanName)
      };

      lobbies.list[newID] = listEntry;
      lobbies.data[newID] = dataEntry;

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      // Authenticate only those clients who are in the lobby
      const auth = steamid => listEntry.players.includes(steamid);

      // Handle incoming messages from clients
      const message = async function (message, ws) {

        const { steamid } = ws.data;
        const data = JSON.parse(message);

        switch (data.type) {

          // Distinguishes browser clients from game clients
          // Game clients are expected to send this right after authenticating
          case "isGame": {

            // Link the socket to the player data
            dataEntry.players[steamid].gameSocket = ws;

            // Broadcast game client join to all lobby clients
            await events(["send", eventName, { type: "lobby_join_game", steamid }], context);

            // If the player had previously crashed, try to recover
            if (dataEntry.crashed.includes(steamid) && dataEntry.state === LOBBY_INGAME) {
              const { file, link } = dataEntry.context.data.map;
              ws.send(JSON.stringify({ type: "getMap", value: { file, link } }));
              // Client WS is synchronous, this will only take effect after the download
              ws.send(JSON.stringify({ type: "lobby_start", map: file }));
            }

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
            // Reject the response if we're a spectator
            if (dataEntry.spectators.includes(steamid)) return;
            // Reject the response if we're not ready
            if (!dataEntry.players[steamid].ready) return;

            let { time, portals } = data.value;

            if (dataEntry.crashed.includes(steamid)) {
              // If the player had crashed, use real-time for timing instead
              const seconds = Date.now() / 1000 - dataEntry.context.data.week.date;
              time = Math.round(seconds * 60);
              // Remove the player from the crashed players list
              dataEntry.crashed = dataEntry.crashed.filter(p => p !== steamid);
            }

            // Submit this run to the lobby leaderboard
            await leaderboard(["add", "lobby", steamid, time, "", portals], dataEntry.context);
            // Broadcast submission to all lobby clients
            await events(["send", eventName, { type: "lobby_submit", value: { time, portals, steamid } }], context);
            // Change the client's ready state to false
            await module.exports(["ready", newID, false, steamid, true], context);

            return;
          }

          // Contains the client's position, portals, and nearby cubes
          case "spectate": {
            // Ignore position packets sent by spectators
            if (dataEntry.spectators.includes(steamid)) return;
            // Convert the strings of coordinates/angles to arrays of numbers
            const arrPlayer = data.player.split(" ").map(Number);
            const arrPortals = data.portals.split(" ").map(Number).map(c => c.toFixed(3));
            const arrCube = data.cube.split(" ").map(Number).map(Math.round);
            // Construct the outgoing message
            const output = {
              type: "spectate",
              pos: arrPlayer.slice(0, 3),
              ang: arrPlayer.slice(3, 5),
              portals: [
                arrPortals.slice(0, 6).join(" "),
                arrPortals.slice(6, 12).join(" ")
              ],
              cube: {
                pos: arrCube.slice(0, 3),
                ang: arrCube.slice(3, 6),
                type: arrCube[6]
              },
              steamid: steamid,
              name: (await users(["get", steamid])).name
            };
            // Send this message to all spectators
            for (const spectator of dataEntry.spectators) {
              if (!dataEntry.players[spectator].gameSocket) continue;
              dataEntry.players[spectator].gameSocket.send(JSON.stringify(output));
            }
            return;
          }

        }

      };

      // Handle clients disconnecting and close lobby if empty
      const disconnect = async function (ws) {

        const { steamid } = ws.data;

        // Ensure the player is still in the lobby
        if (!listEntry.players.includes(steamid)) return;
        if (!(steamid in dataEntry.players)) return;

        // Handle disconnecting game clients
        if (dataEntry.players[steamid].gameSocket === ws) {
          // Delete the WebSocket handle
          delete dataEntry.players[steamid].gameSocket;
          if (listEntry.state === LOBBY_IDLE) {
            // If the lobby was idle, just force-unready the player
            try {
              await module.exports(["ready", newID, false, steamid, true], context);
            } catch { }
          } else {
            // If the lobby was in-game, flag the player as having crashed
            dataEntry.crashed.push(steamid);
          }
          return;
        } else {
          /**
           * If it's the browser client that disconnected, remove the player from
           * the crash list. Waiting here is admittedly a hacky approach, and
           * ideally we'd have the browser cleanly report a page close, but really
           * any approach I can currently think of is prone to race conditions.
           */
          setTimeout(function () {
            dataEntry.crashed = dataEntry.crashed.filter(p => p !== steamid);
          }, 1000);
        }

        // Disconnect the connected game client (if any) for this player
        if (dataEntry.players[steamid].gameSocket) {
          dataEntry.players[steamid].gameSocket.close(1001, "LOBBY_LEAVE");
          delete dataEntry.players[steamid].gameSocket;
        }

        try {
          // Force ready state to false
          await module.exports(["ready", newID, false, steamid, true], context);
          // Remove the player from the lobby
          await module.exports(["leave", newID, steamid], context);
        } catch { }

      };

      // Create the lobby creation event
      await events(["create", eventName, auth, message, null, disconnect], context);

      // Broadcast a heartbeat ping every 30 seconds
      let lobbyHeartbeat;
      lobbyHeartbeat = setInterval(async function () {
        if (!(await events(["get", eventName], context))) return clearInterval(lobbyHeartbeat);
        await events(["send", eventName, { type: "ping" }], context);
      }, 30000);

      return `SUCCESS ${newID}`;

    }

    case "join": {

      // Remove passwords from logs
      args[2] = "********";

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];

      // Ensure the user and lobby exist
      const user = await users(["get", steamid], context);
      if (!user) throw new UtilError("ERR_STEAMID", args, context);

      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);
      if (dataEntry.password && !(await Bun.password.verify(password, dataEntry.password))) throw new UtilError("ERR_PASSWORD", args, context);
      if (dataEntry.maxplayers !== null && listEntry.players.length >= dataEntry.maxplayers) throw new UtilError("ERR_FULL", args, context);

      // If the player is already in the lobby, pretend the join was successful
      if (listEntry.players.includes(steamid)) return "SUCCESS";

      // Count the amount of wins this player had before leaving
      let wins = 0;
      for (const cat in dataEntry.context.data.leaderboard) {
        // Skip current leaderboard if players are in-game
        if (dataEntry.state === LOBBY_INGAME && cat === "lobby") continue;
        // For every 1st place placement, add one win
        const lb = dataEntry.context.data.leaderboard[cat];
        if (lb.find(c => c.steamid === steamid && c.placement === 1)) wins ++;
      }

      // If recovering from a crash, count this player as ready
      const ready = dataEntry.crashed.includes(steamid);

      // Add the player to the lobby
      listEntry.players.push(steamid);
      dataEntry.players[steamid] = { wins, ready };

      // The first player to join is given the role of host
      if (!dataEntry.host) dataEntry.host = steamid;

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      // Brodcast the join to clients
      await events(["send", "lobby_" + lobbyid, { type: "lobby_join", steamid }], context);

      return "SUCCESS";

    }

    case "rename": {

      const newName = args[2].trim();

      // Ensure the new name is valid
      if (!newName || newName.length > 50) throw new UtilError("ERR_NEWNAME", args, context);

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Rename the lobby
      listEntry.name = newName;

      // Brodcast name change to clients
      await events(["send", eventName, { type: "lobby_name", newName }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "password": {

      // Remove passwords from logs
      args[2] = "********";

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Set the lobby password
      const hashedPassword = password && await Bun.password.hash(password);
      dataEntry.password = password ? hashedPassword : false;

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "maxplayers": {

      const maxplayers = parseInt(args[2]);

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // If no value (or an invalid value) is provided, remove lobby size restrictions
      if (!maxplayers || maxplayers < 1 || isNaN(maxplayers)) dataEntry.maxplayers = null;
      // Otherwise, update the max player count
      else dataEntry.maxplayers = maxplayers;

      // Broadcast the size change
      await events(["send", eventName, { type: "lobby_maxplayers", maxplayers: dataEntry.maxplayers }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "map": {

      const [ mapid, hidden ] = args.slice(2);

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Reject map change if the lobby is in-game
      if (dataEntry.state === LOBBY_INGAME) throw new UtilError("ERR_INGAME", args, context);

      // Check if the map provided is currently being played in the weekly tournament
      // The loose equality check here is intentional, as either ID might in rare cases be a number
      if (mapid == epochtal.data.week.map.id) throw new UtilError("ERR_WEEKMAP", args, context);

      let newMap;

      // Check if the string provided is a known campaign map name or a workshop map ID
      const campaignMap = campaignMaps.find(c => c.id === mapid);
      if (campaignMap) {

        newMap = {
          id: campaignMap.id,
          title: campaignMap.title,
          thumbnail: campaignMap.thumbnail,
          author: "Valve",
          file: campaignMap.id
        };

      } else {

        // We forge the map entry from a raw workshop request to extract only what we need
        let details;
        if (mapid === "random") details = await workshopper(["random"]);
        else details = await workshopper(["get", mapid, true]);

        newMap = {
          id: details.publishedfileid,
          title: details.title,
          thumbnail: details.preview_url,
          link: details.file_url
        };

        // If marked as hidden, don't store the map thumbnail
        if (hidden) {
          newMap.thumbnail = "https://epochtal.p2r3.com/icons/unknown-wide.jpg";
        }

        // Fetch the map author's username
        try {
          const authorRequest = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${details.creator}`);
          const authorData = await authorRequest.json();
          newMap.author = authorData.response.players[0].personaname;
        } catch {
          newMap.author = "unknown";
        }

        // Get the path to which the map is saved when subscribed to
        const pathWorkshop = details.file_url.split("/ugc/").pop().split("/")[0];
        const pathBSP = details.filename.split("/").pop().slice(0, -4);
        newMap.file = `workshop/${pathWorkshop}/${pathBSP}`;

      }

      // Set the lobby map
      dataEntry.context.data.map = newMap;
      // Append map to lobby map history
      dataEntry.context.data.maps.push(newMap);

      // Force all player ready states to false
      for (const player in dataEntry.players) dataEntry.players[player].ready = false;
      // Brodcast map change to clients
      await events(["send", eventName, { type: "lobby_map", newMap }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "mode": {

      const newMode = args[2].trim().toLowerCase();

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Switch the lobby mode
      listEntry.mode = newMode;
      await handleStateChange(lobbyid, context, true);

      // Brodcast mode change to clients
      await events(["send", eventName, { type: "lobby_mode", newMode }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "ready": {

      // Ensure that readyState is a boolean
      const readyState = args[2] == true;
      // Whether to force ready state change regardless of lobby state
      const force = args[4];

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Throw ERR_INGAME if the game has already started
      if (!force && dataEntry.state === LOBBY_INGAME) {
        throw new UtilError("ERR_INGAME", args, context);
      }

      // Get the player's lobby data
      const playerData = dataEntry.players[steamid];

      if (readyState) {

        // Throw ERR_NOMAP if the lobby has no map set
        if (dataEntry.context.data.map === null) throw new UtilError("ERR_NOMAP", args, context);

        // Check if the player's game client is connected
        const gameSocket = playerData.gameSocket;
        if (!gameSocket) throw new UtilError("ERR_GAMEAUTH", args, context);

        // Ensure that the player has the map file
        const mapFile = dataEntry.context.data.map.file;
        const mapLink = dataEntry.context.data.map.link;

        // Perform the check only if the map has a link to be downloaded
        if (mapLink) {
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
              await events(["send", eventName, { type: "lobby_download_start", steamid }], context);

              // Wait for another response from the client indicating success (1) or failure (-1)
              const downloadMapCode = await new Promise(function (resolve, reject) {
                // Set up a callback function for the request
                playerData.getMapCallback = val => resolve(val);
              });

              // Broadcast the end of the download
              await events(["send", eventName, { type: "lobby_download_end", steamid }], context);

              // If the download was successful, do nothing and continue
              if (downloadMapCode === 1) break;
              // If the download was attempted but failed, throw ERR_MAP
              throw new UtilError("ERR_MAP", args, context);

            }

            // If the response was something other than expected, throw ERR_MAP
            default: throw new UtilError("ERR_MAP", args, context);

          }
        }

        // Set the player's ready state to true
        playerData.ready = true;

        // If everyone's ready, start the game
        let everyoneReady = true;
        for (const curr in dataEntry.players) {
          // Ignore spectators without connected game clients
          if (dataEntry.spectators.includes(steamid) && !dataEntry.players[steamid].gameSocket) continue;
          if (!dataEntry.players[curr].ready) {
            everyoneReady = false;
            break;
          }
        }
        if (everyoneReady) {
          // Don't auto-start the very first round of a COTD lobby
          if (!(listEntry.mode === "cotd" && !("roundTimeout" in dataEntry))) {
            await module.exports(["start", lobbyid], context);
          }
        }

      } else {

        // Set the player's ready state to false
        playerData.ready = false;

        // If no one is ready, reset the lobby state
        let nobodyReady = true;
        for (const curr in dataEntry.players) {
          if (dataEntry.players[curr].ready && !dataEntry.spectators.includes(curr)) {
            nobodyReady = false;
            break;
          }
        }
        if (nobodyReady) {
          // Broadcast the lobby state change to clients
          const previousState = dataEntry.state;
          dataEntry.state = LOBBY_IDLE;
          if (previousState === LOBBY_INGAME) {
            await events(["send", eventName, { type: "lobby_finish" }], context);
            await handleStateChange(lobbyid, context);
          }
        }

      }

      // Brodcast ready state to clients
      await events(["send", eventName, { type: "lobby_ready", steamid, readyState }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "host": {

      const newHost = args[2];

      // Ensure a valid user SteamID was provided
      if (newHost) {
        const user = await users(["get", newHost], context);
        if (!user) throw new UtilError("ERR_STEAMID", args, context);
      }

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);
      // Ensure the new host is in the lobby
      if (newHost && !listEntry.players.includes(newHost)) throw new UtilError("ERR_STEAMID", args, context);

      /**
       * Assign the new host. If a falsy value was provided, use a string
       * that cannot be translated into a SteamID to instead permanently
       * remove any host from the lobby.
       */
      dataEntry.host = newHost || "nobody";

      // Brodcast host change to clients
      await events(["send", eventName, { type: "lobby_host", steamid: newHost }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "leave": {

      const steamid = args[2];

      // Ensure a valid user SteamID was provided
      const user = await users(["get", steamid], context);
      if (!user) throw new UtilError("ERR_STEAMID", args, context);

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Remove the player from the lobby
      const index = listEntry.players.indexOf(steamid);
      if (index !== -1) listEntry.players.splice(index, 1);
      if (steamid in dataEntry.players) {
        if (dataEntry.players[steamid].gameSocket) {
          dataEntry.players[steamid].gameSocket.close(1001, "LOBBY_LEAVE");
        }
        delete dataEntry.players[steamid];
      }

      // If the host just left, assign a new host
      if (dataEntry.host === steamid) {
        dataEntry.host = listEntry.players[0];
        // Broadcast the host change to clients
        await events(["send", eventName, { type: "lobby_host", steamid: listEntry.players[0] }], context);
      }

      // If a spectator just left, remove them from the spectators list
      const spectatorIndex = dataEntry.spectators.indexOf(steamid);
      if (spectatorIndex !== -1) {
        dataEntry.spectators.splice(spectatorIndex, 1);
      }

      // Brodcast the leave to clients
      await events(["send", eventName, { type: "lobby_leave", steamid }], context);

      // Delete the lobby if it is still empty 10 seconds after all players have left
      // These checks are bypassed on the very first round of a COTD lobby
      const isCOTDFirstRound = listEntry.mode === "cotd" && !("roundTimeout" in dataEntry);
      if (listEntry.players.length === 0 && !isCOTDFirstRound) {

        setTimeout(async function () {
          if (listEntry.players.length !== 0) return;

          delete lobbies.list[lobbyid];
          delete lobbies.data[lobbyid];
          if (file) Bun.write(file, JSON.stringify(lobbies));

          try {
            await events(["delete", eventName], context);
          } catch {
            // Prevent a full server crash in case of a race condition
          }
        }, 10000);

      } else if (!isCOTDFirstRound) {

        // If everyone remaining is ready, start the game
        let everyoneReady = true;
        for (const curr in dataEntry.players) {
          // Ignore spectators without connected game clients
          if (dataEntry.spectators.includes(steamid) && !dataEntry.players[steamid].gameSocket) continue;
          if (!dataEntry.players[curr].ready) {
            everyoneReady = false;
            break;
          }
        }
        if (everyoneReady && dataEntry.state !== LOBBY_INGAME) {
          await module.exports(["start", lobbyid], context);
        }

      }

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "start": {

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Don't proceed if we're already in-game
      if (dataEntry.state === LOBBY_INGAME) throw new UtilError("ERR_INGAME", args, context);

      // Make sure the lobby has a map
      if (dataEntry.context.data.map === null) throw new UtilError("ERR_NOMAP", args, context);
      const mapFile = dataEntry.context.data.map.file;

      // Clear and archive current lobby leaderboard
      const lobbyLeaderboard = dataEntry.context.data.leaderboard;
      const leaderboardCount = Object.keys(lobbyLeaderboard).length;
      lobbyLeaderboard["lobby" + leaderboardCount] = lobbyLeaderboard["lobby"];
      lobbyLeaderboard["lobby"] = [];

      // Clear crashed players list
      dataEntry.crashed = [];

      // Change the lobby state
      dataEntry.state = LOBBY_INGAME;
      await handleStateChange(lobbyid, context);
      // Broadcast game start to clients
      await events(["send", eventName, { type: "lobby_start", map: mapFile }], context);
      // Store the current time in the lobby context
      dataEntry.context.data.week.date = Date.now() / 1000;

      return "SUCCESS";

    }

    case "abort": {

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Force the ready state of all players to false
      for (const curr in dataEntry.players) {
        await module.exports(["ready", lobbyid, false, curr, true], context);
      }

      return "SUCCESS";

    }

    case "spectate": {

      const spectatorState = args[2];

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Add or remove this player from the spectators list
      if (spectatorState) {
        if (dataEntry.spectators.includes(steamid)) return;
        dataEntry.spectators.push(steamid);
      } else {
        const index = dataEntry.spectators.indexOf(steamid);
        if (index === -1) return;
        dataEntry.spectators.splice(index, 1);
      }

      // Broadcast new spectators list to players
      await events(["send", eventName, { type: "lobby_spectators", steamids: dataEntry.spectators }], context);

      // Write the lobbies to file if it exists
      if (file) Bun.write(file, JSON.stringify(lobbies));

      return "SUCCESS";

    }

    case "chat": {

      const message = args[2];

      const listEntry = lobbies.list[lobbyid];
      const dataEntry = lobbies.data[lobbyid];
      const eventName = "lobby_" + lobbyid;

      // Ensure the lobby exists
      if (!listEntry || !dataEntry) throw new UtilError("ERR_LOBBYID", args, context);

      // Ensure the message is within 200 characters
      if (message.length > 200) throw new UtilError("ERR_LENGTH", args, context);
      // Ensure the message isn't empty
      if (message.trim().length === 0) throw new UtilError("ERR_EMPTY", args, context);

      // Broadcast chat message to players
      await events(["send", eventName, { type: "lobby_chat", steamid: steamid, value: message }], context);

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
