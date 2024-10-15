var lobby, users, whoami;
var avatarCache = {};
var lobbySocket = null;
var readyState = false;
var amHost = false;

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

  // Sort players by their latest time
  lobby.listEntry.players.sort(function (a, b) {

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

    output += `
<div class="lobby-player">
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
  <p class="lobby-player-name">${username}${run ? ` - ${ticksToString(run.time)}` : ""}</p>
  <i
    class="${ready ? "fa-solid fa-circle-check" : "fa-regular fa-circle"} lobby-player-ready"
    onmouseover="showTooltip('${ready ? "Ready" : "Not ready"}')"
    onmouseleave="hideTooltip()"
  ></i>
</div>
    `;

  }

  lobbyPlayersList.innerHTML = output;

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
      <button id="lobby-map-button" onclick="selectLobbyMap()">Select</button>
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
    <button id="lobby-map-button" onclick="selectLobbyMap()">Select</button>
  `;

}

/**
 * Updates the UI to indicate whether we're the lobby host
 */
function updateLobbyHost () {

  // Enable or disable settings buttons based on if we're the host
  const buttons = [
    document.querySelector("#lobby-name-button"),
    document.querySelector("#lobby-password-button")
  ];

  if (amHost) {
    for (const button of buttons) {
      button.style.opacity = 1.0;
      button.style.cursor = "pointer";
      button.removeAttribute("onmouseover");
      button.removeAttribute("onmouseleave");
    }
  } else {
    for (const button of buttons) {
      button.style.opacity = 0.5;
      button.style.cursor = "default";
      button.setAttribute("onmouseover", "showTooltip('Only the host can do this.')");
      button.setAttribute("onmouseleave", "hideTooltip()");
    }
  }

  // Hide the map select button entirely for non-hosts
  const mapButton = document.querySelector("#lobby-map-button");
  if (amHost) mapButton.style.display = "";
  else mapButton.style.display = "none";

};

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

    case "lobby_name": {

      // Rename the lobby
      document.querySelector("#lobby-name").textContent = data.newName;

      return;
    }

    case "lobby_leave": {

      // Handle player leaving the lobby
      const { steamid } = data;

      const index = lobby.listEntry.players.indexOf(steamid);
      if (index === -1) return;

      lobby.listEntry.players.splice(index, 1);
      updatePlayerList();

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

      return;
    }

    case "lobby_host": {

      // Handle lobby host change
      const { steamid } = data;

      lobby.data.host = steamid;
      updatePlayerList();
      updateLobbyHost();

      return;
    }

    case "lobby_map": {

      // Update the lobby map
      lobby.data.context.map = data.newMap;
      updateLobbyMap();

      // Set all player ready states to false
      for (const player in lobby.data.players) player.ready = false;
      updatePlayerList();

      // Update our own ready state
      readyState = false;
      lobbyReadyButton.innerHTML = "I'm ready!";

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

  // Display the lobby name and mode
  let modeString;
  switch (lobby.listEntry.mode) {
    case "ffa": modeString = "Free For All"; break;
    default: modeString = "Unknown"; break;
  }

  lobbyNameText.textContent = lobby.listEntry.name;
  lobbyModeText.innerHTML = "&nbsp;- " + modeString;

  // Update the player list and map display
  updatePlayerList();
  updateLobbyMap();
  updateLobbyHost();

  // Connect to the WebSocket
  if (lobbySocket) lobbySocket.close();

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  lobbySocket = new WebSocket(`${protocol}://${window.location.host}/api/events/connect`);
  lobbySocket.onopen = async function () {
    const token = await (await fetch(`/api/events/auth/lobby_${lobbyid}`)).json();
    lobbySocket.send(token);
  };
  lobbySocket.addEventListener("message", lobbyEventHandler);

  // Prompt game client authentication
  if (!("promptedGameAuth") in window) {
    showPopup(
      "Connect with Portal 2",
      `To connect your game client, start the "Epochtal Live" Spplice package, <a href="javascript:copyEventToken()">click here</a> to copy your lobby token, then paste that into your console.`
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

  window.selectLobbyMap = function () {

    // Prompt for a workshop map link
    showPopup("Select a map", `<p>Enter a workshop link, or a map name from the single-player campaign.</p>
      <input type="text" placeholder="Workshop Link" id="lobby-settings-map-input"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      // Get mapid from link
      const input = document.querySelector("#lobby-settings-map-input");
      const mapid = input.value.trim().toLowerCase().split("https://steamcommunity.com/sharedfiles/filedetails/?id=").pop().split("?")[0];

      hidePopup();

      // Request map change from API
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

  }

  /**
   * Fetches the lobby event token and copies it to clipboard.
   */
  window.copyEventToken = async function () {

    const token = await (await fetch(`/api/events/auth/lobby_${lobbyid}`)).json();
    navigator.clipboard.writeText(`echo ws:${token}`);

    return showPopup("Token copied", "A new token has been copied to your clipboard. It is valid for 30 seconds, starting now. Paste it in your Portal 2 console to complete the setup.");

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
