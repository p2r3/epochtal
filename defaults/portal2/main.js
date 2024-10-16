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
    game.send(gameSocket, line.slice(16) + "\n");
    return;
  }

  // Respond to coop portalgun pings
  if (line.indexOf("[coop_portal_ping]") !== -1) {

    // Hide the message from the onscreen chat and respond with a pong
    game.send(gameSocket, "hud_saytext_time 0;say [coop_portal_pong]\n");
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
    game.send(gameSocket, "script ::coopUpdatePortals()\n");

    return;
  }

  // Respond to request for server timestamp
  if (line.indexOf("[RequestTimestamp]") !== -1 || line.indexOf("Recording to ") === 0) {

    // Request server timestamp from API
    const timestamp = download.string(HTTP_ADDRESS + "/api/timestamp/get");

    if (!timestamp) {
      // If the request fails, run a script that informs the player
      game.send(gameSocket, "script ::serverUnreachable()\n");
    } else {
      // Send a no-op command to log the timestamp in the demo file
      game.send(gameSocket, "-alt1 ServerTimestamp " + timestamp + "\n");
    }

    return;
  }

  // Process WebSocket token
  if (line.indexOf("ws : ") === 0) {
    if (!webSocketAttempt) {
      webSocketAttempt = true;
      game.send(gameSocket, "echo Looks like you're trying to connect to an Epochtal Live lobby.\n");
      game.send(gameSocket, "echo Please use the dedicated Epochtal Live Spplice package for that instead, this will not work.\n");
      game.send(gameSocket, "echo \"\"\n");
      game.send(gameSocket, "echo If you know what you're doing, send the command again.\n");
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
  const buffer = game.read(gameSocket, 1024);
  // If we received nothing, don't proceed
  if (buffer.length === 0) return;

  // Add the latest buffer to any partial data we had before
  lastLine += buffer;

  // Split up the output into lines
  const lines = lastLine.replace(/\r/, "").split("\n");
  // Store the last entry of the array as a partially received line
  lastLine = lines.pop();

  // Process each complete line of console output
  lines.forEach(processConsoleLine);

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
      game.send(gameSocket, "echo Authentication complete.\n");

      // Send isGame event to inform the server of our role
      if (!ws.send(webSocket, '{"type":"isGame","value":"true"}')) {
        game.send(gameSocket, "echo Failed to send isGame event. Disconnecting.\n");
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
    game.send(gameSocket, "echo Connecting to WebSocket...\n");
    webSocket = ws.connect(WS_ADDRESS + "/api/events/connect");

    // Clear the token and exit if the connection failed
    if (!webSocket) {
      game.send(gameSocket, "echo WebSocket connection failed.\n");
      webSocketToken = null;
      return;
    }

    // Send the token to authenticate
    game.send(gameSocket, "echo Connection established, authenticating...\n");
    const success = ws.send(webSocket, webSocketToken);
    webSocketToken = null;

    // On transmission failure, assume the socket is dead
    if (!success) {
      game.send(gameSocket, "echo Failed to send authentication token.\n");
      ws.disconnect(webSocket);
      webSocket = null;
      return;
    }

    // Shortly after, send a ping to check that we're still connected
    sleep(1000);
    const pingSuccess = ws.send(webSocket, '{"type":"ping"}');

    // If this failed, the server probably closed the connection, indicating auth failure
    if (!pingSuccess) {
      game.send(gameSocket, "echo Authentication failed.\n");
      game.send(gameSocket, 'echo ""\n');
      game.send(gameSocket, "echo The token you provided most likely expired. Tokens are only valid for 30 seconds after being issued.\n");

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
  processConsoleOutput();
  processWebSocket();
  // Sleep for roughly one tick
  sleep(16);
}
