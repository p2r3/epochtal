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

// Time of the currently ongoing run
var totalTicks = 0;
// Session time from last received report
var lastTimeReport = 0;
// Expected session time report:
// 0 - none, 1 - load start, 2 - load end, 3 - run end
var expectReport = 0;
// Name of the map we're running
var runMap = null;

// Store the last partially received line until it can be processed
var lastLine = "";

/**
 * Processes output from the Portal 2 console
 */
function processConsoleOutput () {

  // Receive 1024 bytes from the game console socket
  const buffer = game.read(gameSocket, 1024);
  // If we received nothing, don't proceed
  if (buffer.length === 0) return;

  // Add the latest buffer to any partial data we had before
  lastLine += buffer;

  // Parse output line-by-line
  const lines = lastLine.replace(/\r/, "").split("\n");
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
      game.send(gameSocket, "display_elapsedtime\n");
      expectReport = 1;

      return;
    }

    // Process end of map load event
    if (line.indexOf("Redownloading all lightmaps") === 0) {
      // Request total session time for load end
      game.send(gameSocket, "display_elapsedtime\n");
      expectReport = 2;

      // Process the start of a workshop map
      if (runMap.indexOf("workshop/") === 0) {
        // Attach an output to report time and run end on PTI level end
        // In workshop maps, we can afford running cheat commands
        game.send(gameSocket, 'script ::__elFinish<-function(){ printl("elFinish") }\n');
        game.send(gameSocket, 'ent_fire @relay_pti_level_end AddOutput "OnTrigger !self:RunScriptCode:__elFinish():0:1"\n');
      }

      return;
    }

    // Process workshop map finish event
    if (line.indexOf("elFinish") === 0) {
      // Request total session time for map finish
      game.send(gameSocket, "display_elapsedtime\n");
      expectReport = 3;

      return;
    }

    // Process map transition event
    if (line.indexOf("DEFAULT_WRITE_PATH") !== -1 && line.indexOf(runMap.split("/").pop()) === -1) {
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

      // If this is the end of a run, send the finishRun event
      if (expectReport === 3) {
        const success = ws.send(webSocket, '{"type":"finishRun","value":{"time":'+ totalTicks +',"portals":0}}');
        // Disconnect from socket on failure
        if (!success){
          game.send(gameSocket, "echo Failed to send finishRun event.\n");
          game.send(gameSocket, "echo Please reconnect to the lobby with a new token.\n");
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
        game.send(gameSocket, 'echo "' + e.toString().replace(/\"/g, "'") + '"\n');

      }

      return;
    }

    // Handle round start
    case "lobby_start": {

      // Reset run timer
      totalTicks = 0;
      // Update the currently active map
      runMap = data.map;
      // Clear last known session time
      lastTimeReport = 0;

      // Send the map command to start the map
      game.send(gameSocket, "map " + data.map + "\n");

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
      game.send(gameSocket, "echo Please try again with a new token obtained through the New Token button at the top of the lobby window.\n");

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

  // If we're not connected yet, we can afford a slower loop
  if (!webSocket) sleep(500);
  // Otherwise, we need sub-tick timer precision
  else sleep(5);
}
