/*
 * Due to valve's decision to break most coop commands on orange, a few workarounds are needed to make coop possible again.
 * This main.js file is loaded by spplice and feeds off the console output to relay commands to the game.
 * Additionally, this file is responisble for communicating the server's state to the game client.
 */

const SERVER_ADDRESS = fs.read("address.txt");

let input = "";
let pongIgnore = 0;

let ws = null, wsPrompt = null;

// Generates a random 4 digit code
function generateAuthCode () {
  let code = Math.floor(Math.random() * 10000).toString();
  while (code.length < 4) code = "0" + code;
  return code;
}

// Handles received WebSocket events
function wsMessageHandler (event) {

  const data = JSON.parse(event.data);

  switch (data.type) {
    case "authenticated": {
      ws.send(JSON.stringify({ type: "isGame", value: true }));
      SendToConsole("clear; echo WebSocket connection established.");
      return;
    }
    case "cmd": return SendToConsole(data.value);
    case "ping": return ws.send(JSON.stringify({ type: "pong" }));
  }

}

// Authenticates and sets up a WebSocket connection
function wsSetup (token) {

  const protocol = SERVER_ADDRESS.startsWith("https:") ? "wss" : "ws";
  const hostname = SERVER_ADDRESS.split("://")[1].split("/")[0];

  if (ws) {
    ws.addEventListener("close", () => {
      ws = null;
      wsSetup(token);
    });
    ws.close();
    return;
  }

  ws = new WebSocket(`${protocol}://${hostname}/api/events/connect`);

  ws.addEventListener("message", wsMessageHandler);

  ws.addEventListener("open", () => {
    ws.send(token);
  });

  ws.addEventListener("close", (event) => {
    ws = null;
    SendToConsole("echo \"\"");
    SendToConsole("echo WebSocket connection closed.");
    if (event.reason === "ERR_TOKEN") {
      SendToConsole("echo \"\"");
      SendToConsole("echo The token you provided was invalid.");
    }
  });

}

// Workaround for lack of fs.exists in Spplice 2's JS API
function pathExists (path) {
  try {
    fs.rename(path, path);
    return true;
  } catch (e) {
    return false;
  }
}

// Handle console output
onConsoleOutput(async function (data) {

  // Append new data to the input buffer
  input += data.toString().replaceAll("\r", "");

  // Split the input buffer by newline characters
  const lines = input.split("\n");
  input = lines.pop();

  // Iterate over each completed new line
  for (let i = 0; i < lines.length; i ++) {

    // Relay commands to the game
    if (lines[i].startsWith("[SendToConsole] ")) {
      SendToConsole(lines[i].slice(16));
      continue;
    }

    // Respond to coop portalgun pings
    if (lines[i].includes("[coop_portal_ping]")) {

      // Hide the message from the onscreen chat and respond with a pong
      SendToConsole("hud_saytext_time 0;say [coop_portal_pong]");
      // Up pongIgnore to ignore the next two pings, as they are echos of the same ping on the wrong client
      pongIgnore = 2;

      continue;
    }

    // Respond to coop portalgun pongs
    if (lines[i].includes("[coop_portal_pong]")) {

      // Only respond to the correct pongs
      if (pongIgnore > 0) {
        pongIgnore --;
        continue;
      }
      pongIgnore = 1;

      // Trigger coop vscript to update the portals
      SendToConsole("script ::coopUpdatePortals()");

      continue;
    }

    // Respond to request for server timestamp
    if (lines[i].includes("[RequestTimestamp]") || (lines[i].startsWith("Recording to ") && lines[i].endsWith("..."))) {
      try {

        // Request server timestamp from API
        const request = await fetch(`${SERVER_ADDRESS}/api/timestamp/get`);
        const timestamp = await request.json();

        // Send a no-op command to log the timestamp in the demo file
        SendToConsole(`-alt1 ServerTimestamp ${timestamp}`);

      } catch (e) {

        // If the request fails, run a script that informs the player
        SendToConsole("script ::serverUnreachable()");

      }
      continue;
    }

    // Respond to request for WebSocket connection
    if (lines[i].startsWith("ws : ")) {
      if (!wsPrompt) {
        SendToConsole("echo Looks like you're trying to connect to an Epochtal Live lobby.");
        SendToConsole("echo Please use the dedicated Epochtal Live Spplice package for that instead, this will not work.");
        SendToConsole("echo \"\"");
        SendToConsole("echo If you know what you're doing, send the command again.");
        wsPrompt = true;
        continue;
      }
      wsSetup(lines[i].slice(5));
      continue;
    }

    // Work around an issue in Spplice 2 where the JS interface remains running after game close
    if (lines[i].startsWith("Cya :)")) {
      if (ws) ws.close();
      throw "Game closing";
    }

  }

});

log.appendl("SendToConsole relay enabled!");
