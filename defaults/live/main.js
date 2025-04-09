// Require latest spplice-cpp version
if (!("game" in this)) {
  SendToConsole('disconnect "Epochtal Live requires the latest version of SppliceCPP. Update here: github.com/p2r3/spplice-cpp/releases"');
  throw new Error("Terminating script due to version mismatch.");
}

// Read the server's HTTP address from file
const HTTP_ADDRESS = fs.read("address.txt");
// Get the WebSocket address from the HTTP address
const WS_ADDRESS = HTTP_ADDRESS.replace("http", "ws");

/**
 * Utility funtion, checks if the given file path exists
 * @param {string} path Path to the file or directory, relative to tempcontent
 * @returns {boolean} True if the path exists, false otherwise
 */
function pathExists (path) {
  try { fs.rename(path, path) }
  catch (e) {
    return e.toString() == "Error: fs.rename: New path already occupied";
  }
  return true;
}

do { // Attempt connection with the game's console
  var gameSocket = game.connect();
  sleep(200);
} while (gameSocket === -1);

console.log("Connected to Portal 2 console.");

/**
 * Utility function, cleans up any open sockets and throws an error.
 * This is useful for when the game has closed or when an otherwise
 * critical issue requires us to stop the script.
 */
function doCleanup () {
  // Disconnect from the WebSocket, if any
  if (webSocket) {
    ws.disconnect(webSocket);
    webSocket = null;
  }
  // Disconnect from the game's console
  if (gameSocket !== -1) game.disconnect(gameSocket);
  // Throw an error to terminate the script
  throw new Error("Cleanup finished, terminating script.");
}

/**
 * Utility funtion, attempts to read a command from the console. On failure,
 * attempts to reconnect to the socket.
 * @param {number} socket Game socket file descriptor (index)
 * @param {number} bytes How many bytes to request from the socket
 */
function readFromConsole (socket, bytes) {
  try {
    return game.read(socket, bytes);
  } catch (e) {
    console.error(e);
    // Attempt to reconnect to the game's console
    do {
      if (!game.status()) doCleanup();
      var gameSocket = game.connect();
      sleep(200);
    } while (gameSocket === -1);
    return readFromConsole(gameSocket, bytes);
  }
}

/**
 * Utility funtion, attempts to write a command to the console. On failure,
 * attempts to reconnect to the socket.
 * @param {number} socket Game socket file descriptor (index)
 * @param {number} command Command to send to the console
 */
function sendToConsole (socket, command) {
  try {
    return game.send(socket, command);
  } catch (e) {
    console.error(e);
    // Attempt to reconnect to the game's console
    do {
      if (!game.status()) doCleanup();
      var gameSocket = game.connect();
      sleep(200);
    } while (gameSocket === -1);
    return sendToConsole(gameSocket, command);
  }
}

// Time of the currently ongoing run
var totalTicks = 0;
// Session time from last received report
var lastTimeReport = 0;
// Expected session time report:
// 0 - none, 1 - load start, 2 - load end, 3 - run end
var expectReport = 0;
// Name of the map we're running
var runMap = null;
// Name of the map we were just running
var lastRunMap = null;
// Counts the amount of times `processConsoleOutput` has been called
var consoleTick = 0;
// Whether we're a spectator - resets each round
var amSpectator = false;
// Spectator position and angles for interpolation
var spectatorData = {
  // Current spectator time as loop tick count
  tick: 0,
  // Time of last position update
  lastTick: 0,
  // Ticks between previous and current position update
  deltaTick: 0,
  // Position and angles for interpolating across two samples
  pos: [null, null],
  ang: [null, null],
  // List of available SteamIDs and index of currently spectated player
  targets: [],
  target: 0,
  // Whether godmode has been enabled
  god: false,
  // Contents of last portal/cube position update from VScript
  // These are the only parameters used by players, NOT spectators
  portals: "",
  cube: ""
};

/**
 * Checks whether the player has the right spplice-cpp version and throws
 * a warning if not.
 */
function processVersionCheck () {
  // Use existance of game.status as a heuristic for spplice-cpp version
  if (!("status" in game)) {
    sendToConsole(gameSocket, 'disconnect "Epochtal Live requires the latest version of SppliceCPP. Update here: github.com/p2r3/spplice-cpp/releases"');
    doCleanup();
  }
}

// Store the last partially received line until it can be processed
var lastLine = "";

/**
 * Processes output from the Portal 2 console
 */
function processConsoleOutput () {

  // Increment this function's call counter
  consoleTick ++;

  // Run some less common actions on every 5th console tick
  if (consoleTick % 5 === 0) {
    // Log player position and angles for sending to spectators
    if (!amSpectator && webSocket && runMap) {
      sendToConsole(gameSocket, "spec_pos");
    }
    /**
     * Check if the game is still running, and if not, terminate the script.
     * In most cases, this would've already been caught earlier, but we run
     * it here too just to be safe.
     */
    if (!game.status()) doCleanup();
  }

  // Receive 1024 bytes from the game console socket
  const buffer = readFromConsole(gameSocket, 1024);
  // If we received nothing, don't proceed
  if (buffer.length === 0) return;

  try {
    // Add the latest buffer to any partial data we had before
    lastLine += buffer;
  } catch (_) {
    // Sometimes, the buffer can't be string-coerced for some reason
    return;
  }

  // Parse output line-by-line
  const lines = lastLine.split("\n");
  lines.forEach(function (line) {

    // Process WebSocket token
    if (line.indexOf("ws : ") === 0) {
      webSocketToken = line.slice(5, -1);
      return;
    }

    // The events below this only apply to connected clients
    if (!webSocket) return;

    // Process start of map load event
    if (line.indexOf("---- Host_") === 0) {
      // Request total session time for load start
      sendToConsole(gameSocket, "display_elapsedtime");
      expectReport = 1;

      return;
    }

    // Process end of map load event
    if (line.indexOf("Redownloading all lightmaps") === 0) {
      // Request total session time for load end
      sendToConsole(gameSocket, "display_elapsedtime");
      expectReport = 2;

      return;
    }

    // Process map finish event
    if (line.indexOf("elFinish") === 0) {
      // Request total session time for map finish
      sendToConsole(gameSocket, "display_elapsedtime");
      expectReport = 3;

      return;
    }

    // Process map transition event
    if (runMap && line.indexOf("DEFAULT_WRITE_PATH") !== -1 && line.indexOf(runMap.split("/").pop()) === -1) {
      // Notice that we don't actually request a new time report
      // Instead, we tell it to treat the last one (start of map load) as a map finish event
      expectReport = 3;

      return;
    }

    // Process total session time report
    if (line.indexOf("Elapsed time: ") === 0) {

      // If not expecting a time report, do nothing
      if (!expectReport) return;

      // Parse time from command output
      const seconds = parseFloat(line.slice(14));
      const ticks = Math.round(seconds * 60);

      // If this is the end of a segment, add time since last report to total run time
      if (expectReport !== 2 && lastTimeReport !== 0) {
        totalTicks += ticks - lastTimeReport;
      }

      // Handle the end of a run
      if (expectReport === 3 && runMap) {
        // Close the map after the run has finished
        sendToConsole(gameSocket, "disconnect");
        sendToConsole(gameSocket, "echo;echo Round finished.");
        sendToConsole(gameSocket, "echo \"Final time: " + (totalTicks / 60).toFixed(3) + " seconds.\";echo");
        // Clear current map to indicate that we're not in a run anymore
        lastRunMap = runMap;
        runMap = null;
        // Send the finishRun event
        const success = ws.send(webSocket, '{"type":"finishRun","value":{"time":'+ totalTicks +',"portals":0}}');
        // Disconnect from socket on failure
        if (!success) {
          sendToConsole(gameSocket, "echo Failed to send finishRun event.");
          sendToConsole(gameSocket, "echo Please reconnect to the lobby with a new token.");
          ws.disconnect(webSocket);
          webSocket = null;
        }
      }

      /**
       * Finally, store the time of this report for future reference.
       *
       * Since these reports start counting from engine startup, we need a
       * way to convert that to relative time. Even though the start of a
       * map load doesn't have any special handling above, it's still
       * important to store it so that we're not adding loading times into
       * the final submission.
       */
      lastTimeReport = ticks;
      return;
    }

    // Send spectator position output to server for spectators
    if (line.indexOf("spec_goto ") === 0) {
      ws.send(webSocket, '{"type":"spectate","player":"'+ line.slice(10).trim() +'","portals":"'+ spectatorData.portals +'","cube":"'+ spectatorData.cube +'"}');
      return;
    }
    // Update last known position of portals
    if (line.indexOf("spec_goto_portals ") === 0) {
      spectatorData.portals = line.slice(18).trim();
      return;
    }
    // Update last known position of the nearest cube
    if (line.indexOf("spec_goto_cube ") === 0) {
      spectatorData.cube = line.slice(15).trim();
      return;
    }

    // The events below this only apply to spectators
    if (!amSpectator) return;

    // Handle switching spectated player
    if (line.indexOf("Switching spectated player...") === 0) {
      spectatorData.target ++;
      if (spectatorData.target >= spectatorData.targets.length) {
        spectatorData.target = 0;
      }

      return;
    }

    // Ensure that godmode remains on while spectating
    if (line.indexOf("godmode ON") === 0) {
      spectatorData.god = true;
      return;
    }
    if (line.indexOf("godmode OFF") === 0) {
      sendToConsole(gameSocket, "god");
      return;
    }

  });

  // Store the last entry of the array as a partially received line
  lastLine = lines[lines.length - 1];

}

/**
 * Processes events sent by the server
 *
 * @param {Object} data Event data, as parsed from JSON
 * @param {string} data.type Event type
 */
function processServerEvent (data) {

  switch (data.type) {

    // Handle authentication success
    case "authenticated": {

      // Acknowledge success to the user
      sendToConsole(gameSocket, "echo Authentication complete.");

      // Send isGame event to inform the server of our role
      if (!ws.send(webSocket, '{"type":"isGame","value":"true"}')) {
        sendToConsole(gameSocket, "echo Failed to send isGame event. Disconnecting.");
        ws.disconnect(webSocket);
        webSocket = null;
      }

      return;
    }

    // Handle server pings
    case "ping": {

      // Respond to the ping with a pong
      ws.send(webSocket, '{"type":"pong"}');

      return;
    }

    // Handle request to download a workshop map
    case "getMap": {

      const fullPath = "maps/" + data.value.file + ".bsp";
      const workshopDir = "maps/workshop/" + data.value.file.split("/")[1];

      // Check if we already have the map
      if (pathExists(fullPath)) {
        ws.send(webSocket, '{"type":"getMap","value":1}');
        return;
      }

      try {

        // Indicate start of download procedure with response code 0
        ws.send(webSocket, '{"type":"getMap","value":0}');

        // Ensure the parent path exists
        if (!pathExists(workshopDir)) fs.mkdir(workshopDir);
        // Perform the download
        download.file(fullPath, data.value.link);

        // If the procedure was successful, respond with code 1
        ws.send(webSocket, '{"type":"getMap","value":1}');

      } catch (e) {

        // If the procedure was unsuccessful, respond with code -1
        ws.send(webSocket, '{"type":"getMap","value":-1}');
        // Log the error to the Portal 2 console
        sendToConsole(gameSocket, 'echo "' + e.toString().replace(/\"/g, "'") + '"');

      }

      return;
    }

    // Handle round start
    case "lobby_start": {

      // Update the currently active map
      runMap = data.map;
      // Reset run timer
      totalTicks = 0;
      // Clear last known session time
      lastTimeReport = 0;
      // Start the requested map
      sendToConsole(gameSocket, "disconnect;map " + runMap);

      // Clear spectator state
      amSpectator = false;
      spectatorData.tick = 0;
      spectatorData.lastTick = 0;
      spectatorData.pos = [null, null];
      spectatorData.ang = [null, null];
      spectatorData.target = 0;
      spectatorData.targets = [];
      spectatorData.god = false;
      // Reset specator commands
      sendToConsole(gameSocket, "in_forceuser 0");
      sendToConsole(gameSocket, "sv_cheats 0");
      sendToConsole(gameSocket, "alias +remote_view \"\"");

      return;
    }

    // Handle incoming coordinates for spectating
    case "spectate": {

      // Set up spectator environment
      if (!amSpectator) {
        sendToConsole(gameSocket, "sv_cheats 1");
        sendToConsole(gameSocket, "in_forceuser 1");
        sendToConsole(gameSocket, "alias +remote_view \"echo Switching spectated player...\"");
        sendToConsole(gameSocket, "disconnect;map " + (runMap || lastRunMap));
        amSpectator = true;
      }

      // Add player to targets list if they're not there already
      if (spectatorData.targets.indexOf(data.steamid) === -1) {
        spectatorData.targets.push(data.steamid);
      }

      // Skip packets of players who we're not actively spectating
      if (data.steamid !== spectatorData.targets[spectatorData.target]) return;

      // Force the player into noclip on each position update
      sendToConsole(gameSocket, "noclip 1");
      // Show currently spectated player's name on-screen
      sendToConsole(gameSocket, "script ScriptShowHudMessageAll(\"\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n"+ data.name +"\", 1.0)");
      // Try to enable god mode until we've confirmed that it's on
      if (!spectatorData.god) {
        sendToConsole(gameSocket, "god");
      }

      // Store the tick at which this update was received
      spectatorData.deltaTick = spectatorData.tick - spectatorData.lastTick;
      spectatorData.lastTick = spectatorData.tick;

      /**
       * Position and angle data is linearly interpolated across two
       * consecutive ticks. We store those updates in a 2-long array,
       * cyclically replacing the old entries.
       */
      spectatorData.pos[0] = spectatorData.pos[1];
      spectatorData.ang[0] = spectatorData.ang[1];
      spectatorData.pos[1] = data.pos;
      spectatorData.ang[1] = data.ang;

      // Portals are managed using the portal_place command
      sendToConsole(gameSocket, "portal_place 0 0 " + data.portals[0]);
      sendToConsole(gameSocket, "portal_place 0 1 " + data.portals[1]);

      // Cubes are managed using a non-solid prop created with VScript
      sendToConsole(gameSocket, "script ::__elSpectatorCube(Vector("+ data.cube.pos.join(", ") +"), Vector("+ data.cube.ang.join(", ") +"))");

      return;
    }

  }

}

// Keep track of WebSocket parameters
var webSocket = null;
var webSocketToken = null;

/**
 * Processes communication with the WebSocket
 */
function processWebSocket () {

  // If we have a token, attempt to use it
  if (webSocketToken) {

    // Disconnect existing socket, if any
    if (webSocket) ws.disconnect(webSocket);
    // Start a new WebSocket connection
    sendToConsole(gameSocket, "echo Connecting to WebSocket...");
    webSocket = ws.connect(WS_ADDRESS + "/api/events/connect");

    // Clear the token and exit if the connection failed
    if (!webSocket) {
      sendToConsole(gameSocket, "echo WebSocket connection failed.");
      webSocketToken = null;
      return;
    }

    // Send the token to authenticate
    sendToConsole(gameSocket, "echo Connection established, authenticating...");
    const success = ws.send(webSocket, webSocketToken);
    webSocketToken = null;

    // On transmission failure, assume the socket is dead
    if (!success) {
      sendToConsole(gameSocket, "echo Failed to send authentication token.");
      ws.disconnect(webSocket);
      webSocket = null;
      return;
    }

    // Shortly after, try to read to check that we're still connected
    sleep(1000);
    try {
      const message = ws.read(webSocket);
      // If this succeeded, we do actually have to parse it
      try { processServerEvent(JSON.parse(message)) }
      catch (_) { return }
    } catch (_) {
      // If this failed, the server probably closed the connection, indicating auth failure
      sendToConsole(gameSocket, "echo Authentication failed.");
      sendToConsole(gameSocket, 'echo ""');
      sendToConsole(gameSocket, "echo The token you provided most likely expired. Tokens are only valid for 30 seconds after being issued.");
      sendToConsole(gameSocket, "echo Please try again with a new token obtained through the New Token button at the top of the lobby window.");

      ws.disconnect(webSocket);
      webSocket = null;
      return;
    }

  }

  // If a socket has not been instantiated, don't proceed
  if (!webSocket) return;

  try {
    // Process incoming data until the stack is empty
    var message;
    while ((message = ws.read(webSocket)) !== "") {

      // Attempt to deserialize and process the message
      try { processServerEvent(JSON.parse(message)) }
      catch (_) { continue }

    }
  } catch (_) {
    // If we've dropped down here, the socket has thrown an error
    sendToConsole(gameSocket, 'echo "WebSocket disconnected, attempting to reconnect..."');
    ws.disconnect(webSocket);
    webSocket = ws.connect(WS_ADDRESS + "/api/events/connect");
    while (!webSocket) {
      if (!game.status()) doCleanup();
      sendToConsole(gameSocket, 'echo "Connection failed, trying again..."');
      sleep(1000);
      webSocket = ws.connect(WS_ADDRESS + "/api/events/connect");
    }
  }

}

/**
 * Processes position and angles sent to spectating players
 */
function processSpectator () {

  if (!amSpectator) return;

  spectatorData.tick ++;

  // Don't proceed if we can't interpolate
  if (!spectatorData.pos[0] || !spectatorData.ang[0] || !spectatorData.pos[1] || !spectatorData.ang[1]) return;

  // Ticks since last position update
  const localTick = spectatorData.tick - spectatorData.lastTick;

  // Fraction indicating how far along we are in linear interpolation
  const interp = Math.min(localTick / (spectatorData.deltaTick || 0), 1);

  // Account for yaw angle flipping at 180 degrees
  if (spectatorData.ang[1][1] - spectatorData.ang[0][1] > 180) {
    // Current is negative, next is positive - make current positive
    spectatorData.ang[0][1] += 360;
  } else if (spectatorData.ang[0][1] - spectatorData.ang[1][1] > 180) {
    // Current is positive, next is negative - make current negative
    spectatorData.ang[0][1] -= 360;
  }

  // Calculate interpolated coordinates
  const pos = new Array(3), ang = new Array(2);
  for (var i = 0; i < 3; i ++) {
    pos[i] = spectatorData.pos[0][i] + (spectatorData.pos[1][i] - spectatorData.pos[0][i]) * interp;
    if (i !== 2) ang[i] = spectatorData.ang[0][i] + (spectatorData.ang[1][i] - spectatorData.ang[0][i]) * interp;
  }

  // Adjust for offset between player eyes and origin
  pos[2] -= 64;

  sendToConsole(gameSocket, "setpos "+ pos.join(" "));
  sendToConsole(gameSocket, "setang "+ ang.join(" "));

}

// Run each processing function on an interval
while (true) {
  processVersionCheck();
  processConsoleOutput();
  processWebSocket();
  processSpectator();

  // If we're not connected yet, we can afford a slower loop
  if (!webSocket) sleep(500);
  // Otherwise, we need sub-tick timer precision
  else sleep(5);
}
