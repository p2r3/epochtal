var lobby, users;
var avatarCache = {};

const lobbyPlayersContainer = document.querySelector("#lobby-players-container");
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
      avatar = await (await fetch(`/api/users/avatar/"${steamid}"`)).json();
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

  lobbyPlayersContainer.innerHTML += output;

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
  const safeName = name.replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&", "&amp;")
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

}
lobbyInit();
