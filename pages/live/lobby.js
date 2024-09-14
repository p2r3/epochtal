var lobby, users;
var avatarCache = {};
var lobbySocket = null;

const lobbyPlayersList = document.querySelector("#lobby-players-list");

/**
 * Update player list with current players in the lobby
 */
async function updatePlayerList () {

  let output = "";

  // List all players in the lobby
  for (let i = 0; i < lobby.listEntry.players.length; i ++) {

    const steamid = lobby.listEntry.players[i];
    const user = users[steamid];

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

    output += `
<div class="lobby-player">
  <img src="${avatar}" class="lobby-player-avatar">
  <p class="lobby-player-name">${username}</p>
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

  // If no map is selected, display a placeholder
  if (!lobby.data.map) {
    lobbyMapContainer.innerHTML = `
      <p class="votes-text">No map selected</p>
      <button id="lobby-map-button" onclick="selectLobbyMap()">Select</button>
    `;
    return;
  }

  // Display the map thumbnail and title
  lobbyMapContainer.innerHTML = `
    <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${lobby.data.map.id}" target="_blank">
      <img class="votes-image" alt="thumbnail" src="https://steamuserimages-a.akamaihd.net/ugc/${lobby.data.map.thumbnail}?impolicy=Letterbox&imw=640&imh=360">
      <p class="votes-text">
        ${lobby.data.map.title}<br>
        <i class="font-light">by ${lobby.data.map.author}</i>
      </p>
    </a>
    <button id="lobby-map-button" onclick="selectLobbyMap()">Select</button>
  `;

}

var eventHandlerConnected = false;

/**
 * Handle incoming WebSocket events
 *
 * @param {MessageEvent} event
 */
async function lobbyEventHandler (event) {

  // Parse the incoming data
  const data = JSON.parse(event.data);
  console.log(data, event);

  // Handle the event
  switch (data.type) {

    case "lobby_name": {

      // Rename the lobby
      const encodedName = window.location.href.split("#")[1];
      const name = decodeURIComponent(encodedName);
      const { newName } = data;

      window.location.href = window.location.href.split("#")[0] + "#" + newName;
      lobbyInit();

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
      updatePlayerList();

      return;
    }

    case "lobby_map": {

      // Update the lobby map
      lobby.data.map = data.newMap;
      updateLobbyMap();

      return;
    }

  }

}

/**
 * Initialize the lobby page
 */
async function lobbyInit () {

  // Change the login button to a logout button if the user is logged in
  const whoami = await (await fetch("/api/users/whoami")).json();
  if (whoami !== null) {

    const loginButton = document.querySelector("#login-button");

    loginButton.innerHTML = "Log out";
    loginButton.onclick = function () {
      window.location.href = '/api/auth/logout';
    };

  }

  // Fetch the lobby data
  const encodedName = window.location.href.split("#")[1];
  const name = decodeURIComponent(encodedName);
  const safeName = name.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "<br>")
    .replaceAll("\r", "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");

  users = await (await fetch("/api/users/get")).json();
  lobby = await (await fetch(`/api/lobbies/get/${encodedName}`)).json();

  const lobbyNameText = document.querySelector("#lobby-name");
  const lobbyModeText = document.querySelector("#lobby-mode");

  // Display the lobby name and mode
  let modeString;
  switch (lobby.listEntry.mode) {
    case "ffa": modeString = "Free For All"; break;
    default: modeString = "Unknown"; break;
  }

  lobbyNameText.innerHTML = safeName;
  lobbyModeText.innerHTML = "&nbsp;- " + modeString;

  // Update the player list and map display
  updatePlayerList();
  updateLobbyMap();

  // Connect to the WebSocket
  if (lobbySocket) lobbySocket.close();
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  lobbySocket = new WebSocket(`${protocol}://${window.location.host}/ws/lobby_${encodedName}`);
  lobbySocket.addEventListener("message", lobbyEventHandler);

  // Handle the lobby rename button
  window.changeLobbyName = function () {

    // Display a popup to change the lobby name
    showPopup("Change Name", `
      Enter a new lobby name<br>
      <input id="new-lobby-name" type="text" placeholder="Lobby name" spellcheck="false" style="margin-top:5px"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      hidePopup();

      const newName = encodeURIComponent(document.querySelector("#new-lobby-name").value.trim());

      // Fetch the api to change the lobby name
      const request = await fetch(`/api/lobbies/rename/${encodedName}/${newName}`);
      if (request.status !== 200) {
        return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
      } else {
        const data = await request.json();
        switch (data) {

          case "SUCCESS":
            showPopup("Success", "The lobby name has been successfully updated.");
            return;

          case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
          case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
          case "ERR_NAME": return showPopup("Lobby not found", "An open lobby with this name does not exist.", POPUP_ERROR);
          case "ERR_NEWNAME": return showPopup("Invalid lobby name", "Please keep the lobby name to 50 characters or less.", POPUP_ERROR);
          case "ERR_EXISTS": return showPopup("Lobby name taken", "A lobby with this name already exists.", POPUP_ERROR);
          case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

          default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

        }
      }

    };

  }

  // Handle the lobby change password button
  window.changeLobbyPassword = function () {

    // Display a popup to change the lobby password
    showPopup("Change Password", `
      Enter a new lobby password<br>(leave blank for none)<br>
      <input id="new-lobby-password" type="password" placeholder="Password" spellcheck="false" style="margin-top:5px"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      hidePopup();

      const newPassword = encodeURIComponent(document.querySelector("#new-lobby-password").value.trim());

      // Fetch the api to change the lobby password
      const request = await fetch(`/api/lobbies/password/${encodedName}/${newPassword}`);
      if (request.status !== 200) {
        return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
      } else {
        const data = await request.json();
        switch (data) {

          case "SUCCESS":
            return showPopup("Success", "The lobby password has been successfully updated.");

          case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
          case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
          case "ERR_NAME": return showPopup("Lobby not found", "An open lobby with this name does not exist.", POPUP_ERROR);
          case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);

          default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

        }
      }

    };

  }

  window.selectLobbyMap = function () {

    // Prompt for a workshop map link
    showPopup("Select a map", `<p>Enter a workshop link to the new map.</p>
      <input type="text" placeholder="Workshop Link" id="lobby-settings-map-input"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      // Get mapid from link
      const input = document.querySelector("#lobby-settings-map-input");
      const mapid = input.value.trim().toLowerCase().split("https://steamcommunity.com/sharedfiles/filedetails/?id=").pop().split("?")[0];

      // Ensure mapid is valid
      if (!mapid || isNaN(mapid)) {
        showPopup("Invalid link", "The workshop link you provided could not be parsed.", POPUP_ERROR);
        return;
      }

      hidePopup();

      // Request map change from API
      const request = await fetch(`/api/lobbies/map/${encodedName}/"${mapid}"`);
      if (request.status !== 200) {
        return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
      } else {
        const data = await request.json();
        switch (data) {

          case "SUCCESS":
            showPopup("Success", "The lobby map has been successfully updated.");
            return;

          case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before editing lobby details.", POPUP_ERROR);
          case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
          case "ERR_NAME": return showPopup("Lobby not found", "An open lobby with this name does not exist.", POPUP_ERROR);
          case "ERR_PERMS": return showPopup("Permission denied", "You do not have permission to perform this action.", POPUP_ERROR);
          case "ERR_MAPID": return showPopup("Invalid link", "A workshop map associated with this link could not be found.", POPUP_ERROR);
          case "ERR_STEAMID": return showPopup("Missing map info", "Failed to retrieve map details. Is this the right link?", POPUP_ERROR);

          default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

        }
      }

    };

  }

}
lobbyInit();
