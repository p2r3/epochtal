var lobby, users;
var avatarCache = {};
var lobbySocket = null;

const lobbyPlayersList = document.querySelector("#lobby-players-list");
async function updatePlayerList () {

  let output = "";
  for (let i = 0; i < lobby.listEntry.players.length; i ++) {

    const steamid = lobby.listEntry.players[i];
    const user = users[steamid];

    const username = user.name.replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("&", "&amp;");

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
async function updateLobbyMap () {

  if (!lobby.data.map) {
    lobbyMapContainer.innerHTML = `
      <p class="votes-text">No map selected</p>
      <button id="lobby-map-button" onclick="selectLobbyMap()">Select</button>
    `;
    return;
  }

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
async function lobbyEventHandler (event) {

  const data = JSON.parse(event.data);
  console.log(data, event);

  switch (data.type) {

    case "lobby_name": {

      const encodedName = window.location.href.split("#")[1];
      const name = decodeURIComponent(encodedName);
      const { newName } = data;

      window.location.href = window.location.href.split("#")[0] + "#" + newName;
      lobbyInit();

      return;
    }

    case "lobby_leave": {

      const { steamid } = data;

      const index = lobby.listEntry.players.indexOf(steamid);
      if (index === -1) return;

      lobby.listEntry.players.splice(index, 1);
      updatePlayerList();

      return;
    }

    case "lobby_join": {

      const { steamid } = data;

      if (!lobby.listEntry.players.includes(steamid)) {
        lobby.listEntry.players.push(steamid);
      }
      updatePlayerList();

    }

  }

}

async function lobbyInit () {

  const whoami = await (await fetch("/api/users/whoami")).json();
  if (whoami !== null) {

    const loginButton = document.querySelector("#login-button");

    loginButton.innerHTML = "Log out";
    loginButton.onclick = function () {
      window.location.href = '/api/auth/logout';
    };

  }

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

  let modeString;
  switch (lobby.listEntry.mode) {
    case "ffa": modeString = "Free For All"; break;
    default: modeString = "Unknown"; break;
  }

  lobbyNameText.innerHTML = safeName;
  lobbyModeText.innerHTML = "&nbsp;- " + modeString;

  updatePlayerList();
  updateLobbyMap();

  if (lobbySocket) lobbySocket.close();
  lobbySocket = new WebSocket("ws://epochtal.p2r3.com:3002/ws/lobby_" + encodedName);
  lobbySocket.addEventListener("message", lobbyEventHandler);

  window.changeLobbyName = function () {

    showPopup("Change Name", `
      Enter a new lobby name<br>
      <input id="new-lobby-name" type="text" placeholder="Lobby name" spellcheck="false" style="margin-top:5px"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      hidePopup();

      const newName = encodeURIComponent(document.querySelector("#new-lobby-name").value.trim());

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

  window.changeLobbyPassword = function () {

    showPopup("Change Password", `
      Enter a new lobby password<br>(leave blank for none)<br>
      <input id="new-lobby-password" type="password" placeholder="Password" spellcheck="false" style="margin-top:5px"></input>
    `, POPUP_INFO, true);

    popupOnOkay = async function () {

      hidePopup();

      const newPassword = encodeURIComponent(document.querySelector("#new-lobby-password").value.trim());

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

}
lobbyInit();
