// Polyfills for Spplice 2
if (!("sleep" in this)) eval(fs.read("polyfill.js"));

// Read the server's HTTP address from file
const HTTP_ADDRESS = fs.read("address.txt");
// Get the WebSocket address from the HTTP address
const WS_ADDRESS = HTTP_ADDRESS.replace("http", "ws");

// Utility funtion, checks if the given file path exists
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

// Store the last partially received line until it can be processed
var lastLine = "";

// Processes output from the Portal 2 console
function processConsoleOutput () {

  // Receive 1024 bytes from the game console socket
  const buffer = game.read(gameSocket, 1024);
  // If we received nothing, don't proceed
  if (buffer.length === 0) return;

  // Add the latest buffer to any partial data we had before
  lastLine += buffer;

  // Parse input line-by-line
  const lines = lastLine.replace(/\r/, "").split("\n");
  lines.forEach(function (line) {

    // Process WebSocket token
    if (line.indexOf("ws : ") === 0) {
      webSocketToken = line.slice(5, -1);
    }

  });

  // Store the last entry of the array as a partially received line
  lastLine = lines[lines.length - 1];

}

// Processes events sent by the server
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

    }

    // Handle request to download a workshop map
    case "getMap": {

      const fullPath = "maps/" + data.value.file + ".bsp";
      const workshopDir = "maps/workshop/" + data.falue.file.split("/")[1];

      // Check if we already have the map
      if (pathExists(fullPath)) {
        ws.send('{type:"getMap",value:1}');
        return;
      }

      try {

        // Indicate start of download procedure with response code 0
        ws.send('{type:"getMap",value:0}');

        // Ensure the parent path exists
        if (!pathExists(workshopDir)) fs.mkdir(workshopDir);
        // Perform the download
        download.file(fullPath, data.value.link);

        // If the procedure was successful, respond with code 1
        ws.send('{type:"getMap",value:1}');

      } catch (e) {

        // If the procedure was unsuccessful, respond with code -1
        ws.send('{type:"getMap",value:-1}');
        // Log the error to the Portal 2 console
        game.send(gameSocket, 'echo "' + e.toString().replace(/\"/g, "'") + '"\n');

      }

      return;
    }

    // Handle round start
    case "lobby_start": {

      // Send the map command to start the map
      game.send(gameSocket, "map " + data.map + "\n");

      return;
    }

  }

}

// Keep track of WebSocket parameters
var webSocket = null;
var webSocketToken = null;

// Processes communication with the WebSocket
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
    sleep(200);
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

// Run each processing function every 500ms
while (true) {
  processConsoleOutput();
  processWebSocket();
  sleep(500);
}
