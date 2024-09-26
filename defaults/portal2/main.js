/*
 * Due to valve's decision to break most coop commands on orange, a few workarounds are needed to make coop possible again.
 * This main.js file is loaded by spplice and feeds off the console output to relay commands to the game.
 * Additionally, this file is responisble for communicating the server's state to the game client.
 */

const SERVER_ADDRESS = fs.read("address.txt");

let input = "";
let pongIgnore = 0;

let ws = null;
let menuSession = false;

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
    case "getMap": {
      if (pathExists(`maps/${file}.bsp`)) {
        ws.send(JSON.stringify({ type: "getMap", value: 1 }));
      } else {
        downloadMap(data.value.link, data.value.file);
      }
      return;
    }
    case "lobby_start" : {
      menuSession = true;
      SendToConsole("map " + data.map);
      return;
    }
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
      SendToConsole("echo It most likely expired, as tokens are only valid for 30 seconds after being issued.");
      SendToConsole("echo Please try again with a new token obtained through the New Token button at the top of the lobby window.");
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

// Downloads a map from the workshop, given a link and output path
async function downloadMap (link, file) {

  try {

    // Indicate start of download procedure with response code 0
    ws.send(JSON.stringify({ type: "getMap", value: 0 }));

    const request = await fetch(link);
    const buffer = Buffer.from(await request.arrayBuffer());

    const workshopPath = `maps/workshop/${file.split("/")[1]}`;
    if (!pathExists(workshopPath)) fs.mkdir(workshopPath);
    fs.write(`maps/${file}.bsp`, buffer);

    // If the procedure was successful, respond with 1
    ws.send(JSON.stringify({ type: "getMap", value: 1 }));

  } catch (e) {

    // If the procedure was unsuccessful, respond with -1
    ws.send(JSON.stringify({ type: "getMap", value: -1 }));
    log.append(e.toString());

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
      wsSetup(lines[i].slice(5));
      continue;
    }

    // If connected to WebSocket, report all SAR session timers as "finishRun" events
    // TODO: This isn't a good approach, and should be refactored once lobbies get more attention
    if (ws && lines[i].startsWith("Session: ")) {

      // Ignore the first very one, as that's the session before the map transition
      if (menuSession) {
        menuSession = false;
        continue;
      }

      const ticks = parseInt(lines[i].split("Session: ")[1].split(" (")[0]);
      ws.send(JSON.stringify({ type: "finishRun", value: { time: ticks, portals: 0 } }));

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
