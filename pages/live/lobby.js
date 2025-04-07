var lobby, users, whoami;
var avatarCache = {};
var lobbySocket = null, lobbySocketDisconnected = false;
var readyState = false;
var amHost = false, amSpectator = false;
var localMapQueue = [];
var doRandomMaps = false;

const lobbyPlayersList = document.querySelector("#lobby-players-list");

/**
 * Update player list with current players in the lobby
 */
async function updatePlayerList () {

  let output = "";

  // Get the leaderboard for this lobby mode
  const leaderboard = lobby.data.context.leaderboard[lobby.listEntry.mode];
  // Check if we are the host
  amHost = lobby.data.host === whoami.steamid;
  // Check if we are a spectator
  amSpectator = lobby.data.spectators.includes(whoami.steamid);

  // Sort players by their latest time
  lobby.listEntry.players.sort(function (a, b) {

    // Push spectators to the bottom
    const isSpectatorA = lobby.data.spectators.includes(a);
    const isSpectatorB = lobby.data.spectators.includes(b);

    // If both players are spectators, sort by SteamID string
    if (isSpectatorA && isSpectatorB) {
      return a < b ? 1 : -1;
    }
    // Otherwise, put spectators below non-spectators
    if (isSpectatorA) return 1;
    if (isSpectatorB) return -1;

    const runA = leaderboard.find(c => c.steamid === a);
    const runB = leaderboard.find(c => c.steamid === b);

    const runATime = runA && runA.time;
    const runBTime = runB && runB.time;

    if (runATime === runBTime) {
      // In the event of a tie, prefer the lobby host
      if (a === lobby.data.host) return -1;
      if (b === lobby.data.host) return 1;
      // If neither player is host, sort by SteamID string
      return a < b ? 1 : -1;
    }

    if (!runATime) return 1;
    if (!runBTime) return -1;
    return runA.time - runB.time;

  });

  // List all players in the lobby
  for (let i = 0; i < lobby.listEntry.players.length; i ++) {

    const steamid = lobby.listEntry.players[i];
    let user = users[steamid];

    // If we can't find this user, they might have registered after we joined
    // In that case, re-fetch the user list
    if (user === undefined) {
      users = await (await fetch("/api/users/get")).json();
      user = users[steamid]; // Try to retrieve the user again
      // If this user still don't exist, skip them
      if (user === undefined) continue;
    }

    const username = user.name.replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("&", "&amp;");

    // Fetch avatar from cache or API
    let avatar;
    if (steamid in avatarCache) avatar = avatarCache[steamid];
    else try {
      const profile = await (await fetch(`/api/users/profile/"${steamid}"`)).json();
      avatar = profile.avatar;
      avatarCache[steamid] = avatar;
    } catch (e) {
      avatar = "../icons/unknown.jpg";
    }

    // Get the player's last run in this mode, if they have one
    const run = leaderboard.find(c => c.steamid === steamid);

    // Get the player's ready state
    const ready = lobby.data.players[steamid].ready;
    // Check if this player is the host
    const isHost = lobby.data.host === steamid;
    // Check if this player is a spectator
    const isSpectator = lobby.data.spectators.includes(steamid);

    output += `
<div class="lobby-player ${isSpectator ? "lobby-spectator" : ""}" ${isSpectator ? `style="opacity: 0.5"` : ""}>
  ${(amHost && !isHost) ? `<i
    class="fa-solid fa-xmark lobby-player-kick"
    onmouseover="showTooltip('Kick player')"
    onmouseleave="hideTooltip()"
    onclick="kickPlayer('${steamid}')"
  ></i>` : ""}
  <img
    src="${avatar}"
    class="lobby-player-avatar ${isHost ? "lobby-host-avatar" : (amHost ? "pointer" : "")}"
    ${isHost ? `
      onmouseover="showTooltip('Lobby host')"
      onmouseleave="hideTooltip()"
    ` : (amHost ? `
      onmouseover="showTooltip('Click to transfer host role')"
      onmouseleave="hideTooltip()"
      onclick="transferHost('${steamid}')"
      ` : "")}
  >
  <p class="lobby-player-name">${username}${(run && !isSpectator) ? ` - ${ticksToString(run.time)}` : ""}</p>
  <i
    class="${isSpectator ? "fa-regular fa-eye" : (ready ? "fa-solid fa-circle-check" : "fa-regular fa-circle")} lobby-player-ready"
    onmouseover="showTooltip('${isSpectator ? "Spectating" : (ready ? "Ready" : "Not ready")}')"
    onmouseleave="hideTooltip()"
  ></i>
</div>
    `;

  }

  lobbyPlayersList.innerHTML = output;

  // Update player count text
  const lobbyPlayerCountText = document.querySelector("#lobby-playercount");
  if (lobby.data.maxplayers !== null) {
    lobbyPlayerCountText.textContent = `(${lobby.listEntry.players.length - lobby.data.spectators.length} / ${lobby.data.maxplayers})`;
  } else {
    lobbyPlayerCountText.textContent = `(${lobby.listEntry.players.length - lobby.data.spectators.length})`;
  }

}

const lobbyMapContainer = document.querySelector("#lobby-settings-map");

/**
 * Update the map display in the lobby
 */
async function updateLobbyMap () {

  const lobbyMap = lobby.data.context.map;

  // If no map is selected, display a placeholder
  if (!lobbyMap) {
    lobbyMapContainer.innerHTML = `
      <p class="votes-text">No map selected</p>
      <button id="lobby-map-button" onclick="selectLobbyMap()" ${amHost ? "" : `style="display: none"`}>Select</button>
    `;
    return;
  }

  // Display the map thumbnail and title
  lobbyMapContainer.innerHTML = `
    <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${lobbyMap.id}" target="_blank">
      <img class="votes-image" alt="thumbnail" src="${lobbyMap.thumbnail}?impolicy=Letterbox&imw=640&imh=360">
      <p class="votes-text">
        ${lobbyMap.title}<br>
        <i class="font-light">by ${lobbyMap.author}</i>
      </p>
    </a>
    <button id="lobby-map-button" onclick="selectLobbyMap()" ${amHost ? "" : `style="display: none"`}>Select</button>
  `;

}

/**
 * Updates the UI to indicate whether we're the lobby host
 */
function updateLobbyHost () {

  // Enable or disable settings buttons based on if we're the host
  const grayedButtons = [
    document.querySelector("#lobby-name-button"),
    document.querySelector("#lobby-password-button"),
    document.querySelector("#lobby-maxplayers-button")
  ];
  const hiddenButtons = [
    document.querySelector("#lobby-map-button"),
    document.querySelector("#lobby-forcestart-button"),
    document.querySelector("#lobby-forceabort-button")
  ];

  if (amHost) {
    for (const button of grayedButtons) {
      button.style.opacity = 1.0;
      button.style.cursor = "pointer";
      button.removeAttribute("onmouseover");
      button.removeAttribute("onmouseleave");
    }
    for (const button of hiddenButtons) {
      button.style.display = "inline";
    }
  } else {
    for (const button of grayedButtons) {
      button.style.opacity = 0.5;
      button.style.cursor = "default";
      button.setAttribute("onmouseover", "showTooltip('Only the host can do this.')");
      button.setAttribute("onmouseleave", "hideTooltip()");
    }
    for (const button of hiddenButtons) {
      button.style.display = "none";
    }
  }

}

/**
 * Displays a message in the lobby chat window.
 */
function displayChatMessage (message, from = null) {

  message = message.toString().replaceAll("&quot;", '"')
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  if (from) {
    message = `<a>${users[from].name}</a>: ${message}`;
  } else {
    message = `<a>${message}</a>`;
  }

  const chatOutput = document.querySelector("#lobby-chat-output");
  chatOutput.innerHTML += message + "<br>";

  chatOutput.scrollTop = chatOutput.scrollHeight;

}

var eventHandlerConnected = false;

const lobbyReadyButton = document.querySelector("#lobby-ready-button");

/**
 * Handle incoming WebSocket events
 *
 * @param {MessageEvent} event
 */
async function lobbyEventHandler (event) {

  // Parse the incoming data
  const data = JSON.parse(event.data);

  // Handle the event
  switch (data.type) {

    case "authenticated": {

      // If we previously lost connection, notify user of reconnect
      if (lobbySocketDisconnected) {
        showPopup("Connected", "Connection to server re-established.");
        lobbySocketDisconnected = false;
      }

      return;
    }

    case "lobby_name": {

      // Rename the lobby
      document.querySelector("#lobby-name").textContent = data.newName;

      displayChatMessage(`Lobby name changed to "${data.newName}".`);

      return;
    }

    case "lobby_leave": {

      // Handle player leaving the lobby
      const { steamid } = data;

      // If we've been kicked, return to lobby list page
      if (steamid === whoami.steamid) {
        window.location.href = "/live/#kicked";
        return;
      }

      const index = lobby.listEntry.players.indexOf(steamid);
      if (index === -1) return;

      lobby.listEntry.players.splice(index, 1);
      updatePlayerList();

      displayChatMessage(`${users[steamid].name} left the lobby.`);

      const spectatorIndex = lobby.data.spectators.indexOf(steamid);
      if (spectatorIndex == -1) return;
      lobby.data.spectators.splice(spectatorIndex, 1);

      return;
    }

    case "lobby_join": {

      // Handle player joining the lobby
      const { steamid } = data;

      if (!lobby.listEntry.players.includes(steamid)) {
        lobby.listEntry.players.push(steamid);
      }
      lobby.data.players[steamid] = {};
      updatePlayerList();

      displayChatMessage(`${users[steamid].name} joined the lobby.`);

      return;
    }

    case "lobby_host": {

      // Handle lobby host change
      const { steamid } = data;

      lobby.data.host = steamid;
      updatePlayerList();
      updateLobbyHost();

      displayChatMessage(`${users[steamid].name} is now the host.`);

      return;
    }

    case "lobby_spectators": {

      // Handle spectator list update
      const { steamids } = data;

      lobby.data.spectators = steamids;
      updatePlayerList();

      return;
    }

    case "lobby_maxplayers": {

      // Update the lobby size in the UI
      lobby.data.maxplayers = data.maxplayers;

      const lobbyPlayerCountText = document.querySelector("#lobby-playercount");

      if (lobby.data.maxplayers !== null) {
        lobbyPlayerCountText.textContent = `(${lobby.listEntry.players.length - lobby.data.spectators.length} / ${lobby.data.maxplayers})`;
      } else {
        lobbyPlayerCountText.textContent = `(${lobby.listEntry.players.length - lobby.data.spectators.length})`;
      }

      return;
    }

    case "lobby_map": {

      // Update the lobby map
      lobby.data.context.map = data.newMap;
      updateLobbyMap();

      // Set all player ready states to false
      for (const steamid in lobby.data.players) lobby.data.players[steamid].ready = false;

      // Update our own ready state
      readyState = false;
      lobbyReadyButton.innerHTML = "I'm ready!";

      // If we're a spectator, automatically ready up for any new map
      if (amSpectator) {
        const lobbyid = window.location.href.split("#")[1];
        fetch(`/api/lobbies/ready/${lobbyid}/true`);
      }

      return;
    }

    case "lobby_ready": {

      // Update the ready state of the given player
      lobby.data.players[data.steamid].ready = data.readyState;
      updatePlayerList();

      // If the given player is us, update the client ready state
      if (data.steamid === whoami.steamid) {
        readyState = data.readyState;
        if (readyState) lobbyReadyButton.innerHTML = "Not ready!";
        else lobbyReadyButton.innerHTML = "I'm ready!";
      }

      return;
    }

    case "lobby_submit": {

      // Handle new run submission
      const run = data.value;
      const leaderboard = lobby.data.context.leaderboard[lobby.listEntry.mode];

      const index = leaderboard.findIndex(c => c.steamid === run.steamid);
      if (index !== -1) leaderboard.splice(index, 1);

      leaderboard.push(run);

      return;
    }

    case "lobby_start": {

      // Handle game starting
      setTimeout(function () {

        showPopup("Game starting", "Everyone is ready. The game will now start.");

        // Hide the popup after 5 seconds
        const startPopupTimeout = setTimeout(function () {
          hidePopup();
        }, 5000);

        // Prevent other popups getting hidden by this
        const oldShowPopup = showPopup;
        showPopup = function (title, text, type = POPUP_INFO, hasCancel = false) {
          clearTimeout(startPopupTimeout);
          showPopup = oldShowPopup;
          showPopup(title, text, type, hasCancel);
        };

      }, 1000);

      // Clear previous run times from player list
      lobby.data.context.leaderboard[lobby.listEntry.mode] = [];
      updatePlayerList();

      displayChatMessage(`The round is starting. Good luck!`);

      return;
    }

    case "lobby_finish": {

      // Handle game finishing
      // Switch to the next map in the local queue
      if (amHost) {
        if (doRandomMaps) {
          requestLobbyMapChange(await (await fetch("/api/workshopper/random")).json());
          updateLobbyMap();
        } else if (localMapQueue.length > 0) {
          requestLobbyMapChange(localMapQueue.shift());
          updateLobbyMap();
        }
      }

      return;
    }

    case "lobby_download_start": {

      // Handle a player starting to download the map
      // Currently only relevant to the player downloading the map
      if (data.steamid !== whoami.steamid) return;

      showPopup("Download started", "The map is now being downloaded.");
      return;
    }

    case "lobby_download_end": {

      // Handle a player finishing the map download
      // Currently only relevant to the player downloading the map
      if (data.steamid !== whoami.steamid) return;

      // Display the popup *only if* we're not potentially covering up an error
      const popup = document.querySelector("#global-popup");
      if (popup.style.opacity == 0 || popup.style.borderColor !== "red") {
        showPopup("Download finished", "The map has been downloaded. You have been marked as ready.");
      }

      return;
    }

    case "lobby_join_game": {

      // Handle game client authentication
      // Currently only relevant to the player authenticating
      if (data.steamid !== whoami.steamid) return;

      showPopup("Game connected", "Your game client has been connected successfully. You may now ready up.");
      return;
    }

    case "lobby_chat": {

      // Handle receiving chat messages
      displayChatMessage(data.value, data.steamid);

      return;
    }

  }

}

/**
 * Initialize the lobby page
 */
async function lobbyInit () {

  // If we're coming from a page refresh, put the user back at the lobby list
  // Refreshing causes them to disconnect from the lobby anyway
  if (performance.navigation.type === 1) {
    window.location.href = "/live/";
    return;
  }

  // Change the login button to a logout button if the user is logged in
  whoami = await (await fetch("/api/users/whoami")).json();
  if (whoami !== null) {

    const loginButton = document.querySelector("#login-button");

    loginButton.innerHTML = "Log out";
    loginButton.onclick = function () {
      window.location.href = '/api/auth/logout';
    };

  }

  // Fetch the lobby data
  const lobbyid = window.location.href.split("#")[1];

  users = await (await fetch("/api/users/get")).json();
  lobby = await (await fetch(`/api/lobbies/get/${lobbyid}`)).json();

  const lobbyNameText = document.querySelector("#lobby-name");
  const lobbyModeText = document.querySelector("#lobby-mode");
  const lobbyPlayerCountText = document.querySelector("#lobby-playercount");

  // Display the lobby name and mode
  let modeString;
  switch (lobby.listEntry.mode) {
    case "ffa": modeString = "Free For All"; break;
    default: modeString = "Unknown"; break;
  }

  lobbyNameText.textContent = lobby.listEntry.name;
  lobbyModeText.innerHTML = "&nbsp;- " + modeString;
  if (lobby.data.maxplayers !== null) {
    lobbyPlayerCountText.textContent = `(${lobby.listEntry.players.length - lobby.data.spectators.length} / ${lobby.data.maxplayers})`;
  } else {
    lobbyPlayerCountText.textContent = `(${lobby.listEntry.players.length - lobby.data.spectators.length})`;
  }

  // Update the player list and map display
  updatePlayerList();
  updateLobbyMap();
  updateLobbyHost();

  // Display a notification for this player joining the lobby
  displayChatMessage(`${whoami.username} joined the lobby.`);

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  // Sets up the lobby WebSocket and its associated event handlers
  window.setUpWebSocket = function () {
    // Close existing connection, if any
    if (lobbySocket) lobbySocket.close();
    // Connect to the WebSocket API endpoint
    lobbySocket = new WebSocket(`${protocol}://${window.location.host}/api/events/connect`);
    // Set authentication token on connection
    lobbySocket.onopen = async function () {
      const token = await (await fetch(`/api/events/auth/lobby_${lobbyid}`)).json();
      lobbySocket.send(token);
    };
    // Add event handler for incoming messages
    lobbySocket.addEventListener("message", lobbyEventHandler);
    // Attempt to reconnect to socket if connection closes
    lobbySocket.onclose = function () {
      showPopup("Disconnected", "Lost connection to server. Reconnecting...", POPUP_WARN);
      lobbySocketDisconnected = true;
      setTimeout(window.setUpWebSocket, 1000);
    };
  };
  // Connect to the WebSocket
  window.setUpWebSocket();

  // Prompt game client authentication
  if (!("promptedGameAuth" in window)) {
    showPopup(
      "Connect with Portal 2",
      `To connect your game client, start the "Epochtal Live" Spplice package, click "New Token" at the top of this page to copy your lobby token, then paste that into your console.`
    );
    window.promptedGameAuth = true;
  }

  // Handle the lobby rename button
  window.changeLobbyName = function () {

    // Exit early if we don't have host permissions
    if (!amHost) return;

    // Display a popup to change the lobby name
    showPopup("Change Name", `
      Enter a new lobby name<br>
      <input id="new-lobby-name" type="text" placeholder="Lobby name" spellcheck="false" style="margin-top:5px"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      hidePopup();

      const newName = encodeURIComponent(document.querySelector("#new-lobby-name").value.trim());

      // Fetch the api to change the lobby name
      const request = await fetch(`/api/lobbies/rename/${lobbyid}/${newName}`);
      let requestData;
      try {
        requestData = await request.json();
      } catch (e) {
        return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
      }

      switch (requestData) {
        case "SUCCESS":
          showPopup("Success", "The lobby name has been successfully updated.");
          return;

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
        case "ERR_NEWNAME": return showPopup("Invalid lobby name", "Please keep the lobby name to 50 characters or less.", POPUP_ERROR);
        case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
      }

    };

  }

  // Handle the lobby change password button
  window.changeLobbyPassword = function () {

    // Exit early if we don't have host permissions
    if (!amHost) return;

    // Display a popup to change the lobby password
    showPopup("Change Password", `
      Enter a new lobby password<br>(leave blank for none)<br>
      <input id="new-lobby-password" type="password" placeholder="Password" spellcheck="false" style="margin-top:5px"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      hidePopup();

      const newPassword = encodeURIComponent(document.querySelector("#new-lobby-password").value.trim());

      // Fetch the api to change the lobby password
      const request = await fetch(`/api/lobbies/password/${lobbyid}/${newPassword}`);
      let requestData;
      try {
        requestData = await request.json();
      } catch (e) {
        return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
      }

      switch (requestData) {
        case "SUCCESS":
          return showPopup("Success", "The lobby password has been successfully updated.");

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
        case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
      }

    };

  }

  // Handle the lobby change size button
  window.changeLobbyMaxplayers = function () {

    // Exit early if we don't have host permissions
    if (!amHost) return;

    // Display a popup to change the lobby password
    showPopup("Change lobby size", `
      Enter a new maximum player count for this lobby, or leave it blank to unrestrict the size.
      If the new maximum is smaller than the current player count, existing players will not be kicked.<br><br>
      <input id="new-lobby-maxplayers" type="text" placeholder="Max player count" style="margin-top:5px"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {
      hidePopup();

      const inputValue = document.querySelector("#new-lobby-maxplayers").value.trim();
      const newMaxplayers = parseInt(inputValue);

      /**
       * Validate the user's input. A similar type of check is replicated
       * on the server side, where invalid input unrestricts lobby size,
       * equivalent to leaving the input field blank here.
       */
      if (inputValue && (newMaxplayers < 1 || isNaN(newMaxplayers))) {
        return showPopup("Invalid input", "Please enter a number larger than zero.", POPUP_ERROR);
      }

      // Fetch the api to change the lobby password
      const request = await fetch(`/api/lobbies/maxplayers/${lobbyid}/${newMaxplayers}`);
      let requestData;
      try {
        requestData = await request.json();
      } catch (e) {
        return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
      }

      switch (requestData) {
        case "SUCCESS":
          return showPopup("Success", "The lobby size has been successfully updated.");

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
        case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
      }

    };

  }

  // Requests a map change from API with the given workshop link
  window.requestLobbyMapChange = async function (link) {

    // Get map ID from workshop link
    const mapid = link.trim().toLowerCase().split("https://steamcommunity.com/sharedfiles/filedetails/?id=").pop().split("&")[0];
    const request = await fetch(`/api/lobbies/map/${lobbyid}/"${mapid}"`);

    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    }

    switch (requestData) {
      case "SUCCESS":
        showPopup("Success", "The lobby map has been successfully updated.");
        return;

      case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
      case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
      case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
      case "ERR_INGAME": return showPopup("Game started", "The game has started, you cannot change the lobby map.", POPUP_ERROR);
      case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);
      case "ERR_MAPID": return showPopup("Invalid map", "The string you provided does not name a valid workshop or campaign map.", POPUP_ERROR);
      case "ERR_STEAMAPI": return showPopup("Missing map info", "Failed to retrieve map details. Is this the right link?", POPUP_ERROR);
      case "ERR_WEEKMAP": return showPopup("Active Epochtal map", "You may not play the currently active weekly tournament map in lobbies.", POPUP_ERROR);

      default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
    }

  };

  // Prompts the user to select a map (or maps) for the lobby
  window.selectLobbyMap = function () {

    // Prompt for a workshop map link
    showPopup("Select a map", `<p>Enter a workshop link, or a map name from the single-player campaign, or enter "random" for an endless queue of random workshop maps.</p>
      <div id="lobby-settings-map-list">
        <input type="text" placeholder="Workshop Link" class="lobby-settings-map-input"></input>
        <i class="fa-solid fa-plus" onmouseover="showTooltip('Add another map to queue')" onmouseleave="hideTooltip()" onclick="addMapInput()" style="cursor:pointer"></i></a>
      </div>
    `, POPUP_INFO, true);

    // Reconstruct list from map queue array
    for (const link of localMapQueue) {
      addMapInput(link);
    }

    popupOnOkay = async function () {
      hidePopup();

      // Get all link input fields
      const inputs = document.querySelectorAll(".lobby-settings-map-input");

      // If user entered "random", activate list of random maps
      if (inputs[0].value.trim().toLowerCase() === "random") {
        doRandomMaps = true;
        requestLobbyMapChange(await (await fetch("/api/workshopper/random")).json());
        updateLobbyMap();
        return;
      } else {
        doRandomMaps = false;
      }

      // Update the current map to the first input
      requestLobbyMapChange(inputs[0].value);

      // Push the rest of the maps to the local map queue
      localMapQueue = [];
      for (let i = 1; i < inputs.length; i ++) {
        localMapQueue.push(inputs[i].value);
      }

    };

  }

  // Adds an aditional map link input field to the popup window
  window.addMapInput = function (value = "") {
    hideTooltip();

    // Get the current map link list list
    const mapList = document.querySelector("#lobby-settings-map-list");

    // Create a new entry with a "remove" button
    const entry = document.createElement("div");
    entry.className = "lobby-settings-map-entry";
    entry.innerHTML = `
      <input type="text" placeholder="Workshop Link" class="lobby-settings-map-input"></input>
      <i class="fa-solid fa-minus lobby-settings-map-remove" onmouseover="showTooltip('Remove map from queue')" onmouseleave="hideTooltip()" onclick="event.target.parentElement.remove()" style="cursor:pointer"></i></a>
    `;
    // Prepend it to the list
    mapList.prepend(entry);
    mapList.scrollTop = mapList.scrollHeight;

    // Move all input values up by one to mimic appending an element
    const inputs = document.querySelectorAll(".lobby-settings-map-input");
    for (let i = 0; i < inputs.length - 1; i ++) {
      inputs[i].value = inputs[i + 1].value;
    }
    inputs[inputs.length - 1].value = value;

  };

  /**
   * Fetches the lobby event token and copies it to clipboard. If access
   * to the clipboard is denied, displays it on-screen instead.
   */
  window.copyEventToken = async function () {

    const token = await (await fetch(`/api/events/auth/lobby_${lobbyid}`)).json();

    try {
      navigator.clipboard.writeText(`echo ws:${token}`);
      return showPopup("Token copied", "A new token has been copied to your clipboard. It is valid for 30 seconds, starting now. Paste it in your Portal 2 console to complete the setup.");
    } catch (e) {
      return showPopup("Token generated", `Your token is:<br><a>echo ws:${token}</a><br><br>It is valid for 30 seconds, starting now. Paste it in your Portal 2 console to complete the setup.`);
    }

  }

  window.toggleReadyState = async function () {

    // If no map is selected, throw early
    if (!readyState && !lobby.data.context.map) {
      return showPopup("No map selected", "Please select a map for the lobby.", POPUP_ERROR);
    }

    // This might take a while, prevent the user from spamming the button
    lobbyReadyButton.style.opacity = 0.5;
    lobbyReadyButton.style.pointerEvents = "none";

    // Request ready state change from API
    const request = await fetch(`/api/lobbies/ready/${lobbyid}/${!readyState}`);

    // Restore the button once the request finishes
    lobbyReadyButton.style.opacity = 1.0;
    lobbyReadyButton.style.pointerEvents = "auto";

    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    }

    switch (requestData) {
      case "SUCCESS": return;

      case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
      case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
      case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
      case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);
      case "ERR_GAMEAUTH": return showPopup("Game not connected", `You have not authenticated your Portal 2 game client. Start the "Epochtal Live" Spplice package, <a href="javascript:copyEventToken()">click here</a> to copy your lobby token, then paste that into your console and try again.`, POPUP_ERROR);
      case "ERR_TIMEOUT": return showPopup("Game client timeout", "Timed out while waiting for a response from your game client. Try reconnecting?", POPUP_ERROR);
      case "ERR_MAP": return showPopup("Failed to get map", "An error occurred while automatically downloading the map. Please try subscribing to it on the workshop instead.", POPUP_ERROR);
      case "ERR_NOMAP": return showPopup("No map selected", "Please select a map for the lobby.", POPUP_ERROR);
      case "ERR_INGAME": return showPopup("Game started", "The game has started, you cannot change your ready state.", POPUP_ERROR);

      default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
    }

  };

  window.transferHost = async function (steamid) {

    // Request host role transfer from API
    const request = await fetch(`/api/lobbies/host/${lobbyid}/"${steamid}"`);

    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    }

    switch (requestData) {
      case "SUCCESS": return;

      case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
      case "ERR_STEAMID": return showPopup("Unrecognized user", "The user you've selected does not exist or is not part of this lobby.", POPUP_ERROR);
      case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
      case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

      default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
    }

  };

  window.kickPlayer = async function (steamid) {

    // Request player kick from API
    const request = await fetch(`/api/lobbies/kick/${lobbyid}/"${steamid}"`);

    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    }

    switch (requestData) {
      case "SUCCESS": return;

      case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
      case "ERR_STEAMID": return showPopup("Unrecognized user", "The user you've selected does not exist or is not part of this lobby.", POPUP_ERROR);
      case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
      case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

      default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
    }

  };

  window.forceStart = async function () {

    // If no map is selected, throw early
    if (!readyState && !lobby.data.context.map) {
      return showPopup("No map selected", "Please select a map for the lobby.", POPUP_ERROR);
    }

    // This might take a while, prevent the user from spamming the button
    const forceStartButton = document.querySelector("#lobby-forcestart-button");
    forceStartButton.style.opacity = 0.5;
    forceStartButton.style.pointerEvents = "none";

    // Request force start from API
    const request = await fetch(`/api/lobbies/start/${lobbyid}`);

    // Restore the button once the request finishes
    forceStartButton.style.opacity = 1.0;
    forceStartButton.style.pointerEvents = "auto";

    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    }

    switch (requestData) {
      case "SUCCESS": return;

      case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
      case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
      case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
      case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);
      case "ERR_NOMAP": return showPopup("No map selected", "Please select a map for the lobby.", POPUP_ERROR);
      case "ERR_INGAME": return showPopup("Game started", "The game has already started.", POPUP_ERROR);

      default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
    }

  };

  // Aborts an ongoing match (if any) by un-readying all players
  window.forceAbort = async function () {

    // Request force abort from API
    const request = await fetch(`/api/lobbies/abort/${lobbyid}`);

    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    }

    switch (requestData) {
      case "SUCCESS": return showPopup("Success", "The round has been aborted.");

      case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
      case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
      case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
      case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

      default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
    }

  };

  // Toggle spectator state
  window.spectate = async function () {

    const spectateButton = document.querySelector("#lobby-spectate-button");

    if (amSpectator) {
      document.head.innerHTML = document.head.innerHTML.replace(`<link rel="stylesheet" href="/live/spectate.css">`, "");
      spectateButton.innerHTML = "Spectate";
      return await fetch(`/api/lobbies/spectate/${lobbyid}/false`);
    } else {
      if (!readyState) fetch(`/api/lobbies/ready/${lobbyid}/true`);
      document.head.innerHTML += `<link rel="stylesheet" href="/live/spectate.css">`;
      spectateButton.innerHTML = "Stop Spectating";
      return await fetch(`/api/lobbies/spectate/${lobbyid}/true`);
    }

  }

  // Sends a chat message to be broadcasted to all players
  window.sendChatMessage = async function (message) {

    // Request chat message broadcast from API
    const request = await fetch(`/api/lobbies/chat/${lobbyid}/"${encodeURIComponent(message.replaceAll('"', "&quot;"))}"`);

    let requestData;
    try {
      requestData = await request.json();
    } catch (e) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    }

    switch (requestData) {
      case "SUCCESS": return true;

      case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
      case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
      case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
      case "ERR_LENGTH": return showPopup("Message too long", "Your message wasn't sent because it is too long. Please keep chat messages to under 200 characters.", POPUP_ERROR);
      case "ERR_EMPTY": return;

      default: return showPopup("Unknown error", "The server returned an unexpected response: " + requestData, POPUP_ERROR);
    }

  };

  const chatInputField = document.querySelector("#lobby-chat-input");

  // Sends a chat message containing the chatbox input field data
  window.sendChatMessageFromInput = function (event) {

    // Proceed only if the Enter key has been pressed
    if (event.keyCode !== 13) return;

    const message = chatInputField.value.trim();

    // If there's nothing to send, don't even attempt it
    if (message.length === 0) return;

    // Clear the value of the input box immediately after it's been stored
    chatInputField.value = "";

    // Attempt to send the message
    window.sendChatMessage(message).then(function (success) {
      // If sending the message did not succeed, restore the input box
      if (success !== true) chatInputField.value = message;
    });

  };

  // Focuses the chat window and redirects the given event to it
  window.redirectEventToChat = function (event) {
    // Don't redirect events sent to text input boxes
    if (event.target.tagName.toLowerCase() === "input") return;
    // Don't redirect special keys
    if (!event.key || event.key.length !== 1) return;
    // Add the typed key to the chatbox and focus it
    chatInputField.value += event.key;
    chatInputField.focus();
  };

}
lobbyInit();

/**
 * Leave the current lobby by closing the window
 */
function leaveLobby () {
  // Attempt to close the window
  window.close();
  // If that failed, redirect to the lobby list page
  window.location.href = "/live/";
}
