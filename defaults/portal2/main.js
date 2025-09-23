/**
 * This file provides some patches for co-op scripts, requests and injects
 * server timestamps during runs, and provides a WebSocket interface to
 * the Portal 2 console. The code is written for spplice-cpp, and is made
 * compatible with Spplice 2 via a polyfill script.
 */

// Polyfills for Spplice 2
if (!("game" in this)) eval(fs.read("polyfill.js"));

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
  catch (_) { return false }
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


/**
 * Checks whether the player has the right spplice-cpp version and throws
 * a warning if not.
 */
function processVersionCheck () {
  // Use existence of game.status as a heuristic for spplice-cpp version
  if (!("status" in game)) {
    sendToConsole(gameSocket, 'disconnect "Epochtal requires the latest version of SppliceCPP. Update here: github.com/p2r3/spplice-cpp/releases"');
    doCleanup();
  }
}


// Prevent JS API timeout from firing
sendToConsole(gameSocket, "alias js_test_fail\n");

// Check if we can access the API for timestamps
if (download.string(HTTP_ADDRESS + "/api/timestamp/get")) {
  sendToConsole(gameSocket, "echo Server timestamp test successful.\n");
} else {
  sendToConsole(gameSocket, "disconnect \"Server timestamp test failed, please restart the Spplice package. Demos recorded during this session will not be valid for submission to scored categories.\"\n");
}

// Keep track of co-op sync pings/pongs
var pongIgnore = 0;
// Whether an attempt has been made to provide a WebSocket token
var webSocketAttempt = false;
// Store the last partially received console line until it can be processed
var lastLine = "";

/**
 * Processes individual lines of Portal 2 console output
 *
 * @param {string} line A single complete line of console output
 */
function processConsoleLine (line) {

  // Relay commands to the game
  if (line.indexOf("[SendToConsole] ") === 0) {
    sendToConsole(gameSocket, line.slice(16) + "\n");
    return;
  }

  // Respond to coop portalgun pings
  if (line.indexOf("[coop_portal_ping]") !== -1) {

    // Hide the message from the onscreen chat and respond with a pong
    sendToConsole(gameSocket, "hud_saytext_time 0;say [coop_portal_pong]\n");
    // Up pongIgnore to ignore the next two pings, as they are echos of the same ping on the wrong client
    pongIgnore = 2;

    return;
  }

  // Respond to coop portalgun pongs
  if (line.indexOf("[coop_portal_pong]") !== -1) {

    // Make sure we're not listening to our own pongs
    if (pongIgnore > 0) {
      pongIgnore --;
      return;
    }
    pongIgnore = 1;

    // Trigger coop script function to update the portals
    sendToConsole(gameSocket, "script ::coopUpdatePortals()\n");

    return;
  }

  // Respond to request for server timestamp
  if (line.indexOf("[RequestTimestamp]") !== -1 || line.indexOf("Recording to ") === 0) {

    // Request server timestamp from API
    const timestamp = download.string(HTTP_ADDRESS + "/api/timestamp/get");

    if (!timestamp) {
      // If the request fails, run a script that informs the player
      sendToConsole(gameSocket, "script ::serverUnreachable()\n");
    } else {
      // Send a no-op command to log the timestamp in the demo file
      sendToConsole(gameSocket, "-alt1 ServerTimestamp " + timestamp + "\n");
    }

    return;
  }

  // Process WebSocket token
  if (line.indexOf("ws : ") === 0) {
    if (!webSocketAttempt) {
      webSocketAttempt = true;
      sendToConsole(gameSocket, "echo Looks like you're trying to connect to an Epochtal Live lobby.\n");
      sendToConsole(gameSocket, "echo Please use the dedicated Epochtal Live Spplice package for that instead, this will not work.\n");
      sendToConsole(gameSocket, "echo \"\"\n");
      sendToConsole(gameSocket, "echo If you know what you're doing, send the command again.\n");
      return;
    }
    webSocketToken = line.slice(5, -1);
    return;
  }

  // Force quit when SAR unloads
  if (line.indexOf("Cya :)") === 0) {
    if (webSocket) ws.disconnect(webSocket);
    throw "Game closing";
  }

}

/**
 * Processes output from the Portal 2 console, splitting it up into lines
 * and passing those to processConsoleLine
 */
function processConsoleOutput () {

  // Receive 1024 bytes from the game console socket
  const buffer = readFromConsole(gameSocket, 1024);
  // If we received nothing, don't proceed
  if (buffer.length === 0) return;

  try {
    // Add the latest buffer to any partial data we had before
    lastLine += buffer;
  } catch (_) {
    // legends say, sometimes, the buffer can't be string-coerced for some reason
    return;
  }

  // Split up the output into lines
  try {
    var lines = lastLine.split("\n");
  } catch (_) {
    return;
  }
  // Store the last entry of the array as a partially received line
  lastLine = lines.pop();

  // Process each complete line of console output
  lines.forEach(function (line) {
    try{
      processConsoleLine(line.replace(/\r/g, ""));
    } catch (_) {
      // Sometimes console has non-printable characters on which duktape fails
      return;
    }
  });

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
      sendToConsole(gameSocket, "echo Authentication complete.\n");

      // Send isGame event to inform the server of our role
      if (!ws.send(webSocket, '{"type":"isGame","value":"true"}')) {
        sendToConsole(gameSocket, "echo Failed to send isGame event. Disconnecting.\n");
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

    // Handle requests for console commands
    case "cmd": {
      return sendToConsole(gameSocket, data.value);
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
    sendToConsole(gameSocket, "echo Connecting to WebSocket...\n");
    webSocket = ws.connect(WS_ADDRESS + "/api/events/connect");

    // Clear the token and exit if the connection failed
    if (!webSocket) {
      sendToConsole(gameSocket, "echo WebSocket connection failed.\n");
      webSocketToken = null;
      return;
    }

    // Send the token to authenticate
    sendToConsole(gameSocket, "echo Connection established, authenticating...\n");
    const success = ws.send(webSocket, webSocketToken);
    webSocketToken = null;

    // On transmission failure, assume the socket is dead
    if (!success) {
      sendToConsole(gameSocket, "echo Failed to send authentication token.\n");
      ws.disconnect(webSocket);
      webSocket = null;
      return;
    }

    // Shortly after, send a ping to check that we're still connected
    sleep(1000);
    const pingSuccess = ws.send(webSocket, '{"type":"ping"}');

    // If this failed, the server probably closed the connection, indicating auth failure
    if (!pingSuccess) {
      sendToConsole(gameSocket, "echo Authentication failed.\n");
      sendToConsole(gameSocket, 'echo ""\n');
      sendToConsole(gameSocket, "echo The token you provided most likely expired. Tokens are only valid for 30 seconds after being issued.\n");

      ws.disconnect(webSocket);
      webSocket = null;
      return;
    }

  }

  // If a socket has not been instantiated, don't proceed
  if (!webSocket) return;

  // Process incoming data until the stack is empty
  var message;
  while ((message = ws.read(webSocket)) !== "") {

    // Attempt to deserialize and process the message
    try { processServerEvent(JSON.parse(message)) }
    catch (_) { continue }

  }

}

// Run each processing function on an interval
while (true) {
  processVersionCheck();
  // The errors should be handled inside the functions, but just to be extra sure try catch them here as well.
  try {
    processConsoleOutput();
  } catch (_) {}
  try {
    processWebSocket();
  } catch (_) {}
  // Sleep for roughly one tick
  sleep(16);
}
