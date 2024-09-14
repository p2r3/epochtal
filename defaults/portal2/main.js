/*
 * Due to valve's decision to break most coop commands on orange, a few workarounds are needed to make coop possible again.
 * This main.js file is loaded by spplice and feeds off the console output to relay commands to the game.
 * Additionally, this file is responisble for communicating the server's state to the game client.
 */

const SERVER_ADDRESS = fs.read("address.txt");

let input = "";
let pongIgnore = 0;

let onReadSteamID = null;
let ws = null;

let checkmapBlock = false;
let checkmapExpect = "";

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
    case "cmd": return SendToConsole(data.value);
    case "ping": return ws.send(JSON.stringify({ type: "pong" }));
    case "checkmap": {
      checkmapExpect = data.value;
      SendToConsole("echo [CheckMapStart];sar_workshop_list;echo [CheckMapEnd]");
      return;
    }
  }

}

// Authenticates and sets up a WebSocket connection
function wsSetup () {

  // Trying to load a save file prints the user's SteamID to console as a path
  SendToConsole("load .");

  // Wait for the SteamID to get read from the console
  onReadSteamID = function (steamid) {

    const protocol = SERVER_ADDRESS.startsWith("https:") ? "wss" : "ws";
    const hostname = SERVER_ADDRESS.split("://")[1].split("/")[0];
    const authcode = generateAuthCode();

    SendToConsole("hideconsole");
    SendToConsole(`disconnect "Go to ${hostname} and enter the code ${authcode} when prompted."`);

    ws = new WebSocket(`${protocol}://${hostname}/api/gameauth/connect/${authcode}/"${steamid}"`);
    ws.addEventListener("message", wsMessageHandler);

    ws.addEventListener("open", () => SendToConsole("echo WebSocket connection established."));
    ws.addEventListener("close", () => SendToConsole("echo WebSocket connection closed."));

  };

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

    // Listen for sar_workshop_list blocks requested by the WebSocket
    if (lines[i].startsWith("[CheckMapStart]")) {
      checkmapBlock = true;
      continue;
    }

    if (checkmapBlock) {

      // If we've reached the end of the block, the map wasn't found
      if (lines[i].startsWith("[CheckMapEnd]")) {
        checkmapBlock = false;
        ws.send(JSON.stringify({ type: "checkmap", value: false }));
        continue;
      }

      // If we found the map, report success and stop checking early
      log.appendl(`'${"workshop/" + lines[i]}' === '${checkmapExpect}'`);
      if ("workshop/" + lines[i] === checkmapExpect) {
        ws.send(JSON.stringify({ type: "checkmap", value: true }));
        checkmapBlock = false;
      }

      continue;
    }

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
    if (lines[i] === "Usage:  connect <server>") {
      wsSetup();
      continue;
    }

    // Retrieve SteamID from save file load attempt
    if (lines[i].startsWith("Loading game from SAVE/")) {
      const steamid = lines[i].split("Loading game from SAVE/")[1].split("/....")[0];
      onReadSteamID(steamid);
      continue;
    }
    if (lines[i].startsWith("Loading game from SAVE\\")) {
      const steamid = lines[i].split("Loading game from SAVE\\")[1].split("\\....")[0];
      onReadSteamID(steamid);
      continue;
    }

  }

});

log.appendl("SendToConsole relay enabled!");
