var lobbyListInit = async function () {

  const whoami = await (await fetch("/api/users/whoami")).json();
  if (whoami !== null) {

    const loginButton = document.querySelector("#login-button");

    loginButton.innerHTML = "Log out";
    loginButton.onclick = function () {
      window.location.href = '/api/auth/logout';
    };

  }

  const users = await (await fetch("/api/users/get")).json();
  const avatarCache = {};

  const fetchLobbies = async function () {

    const lobbies = await (await fetch("/api/lobbies/list")).json();

    let output = "";
    for (const name in lobbies) {

      const lobby = lobbies[name];

      const safeName = name.replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("\n", "<br>")
        .replaceAll("\r", "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");

      let playersString = "";
      for (let i = 0; i < lobby.players.length; i ++) {

        const steamid = lobby.players[i];
        const user = users[steamid];
        const username = user.name.replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");

        let avatar;
        if (steamid in avatarCache) avatar = avatarCache[steamid];
        else try {
          const profile = await (await fetch(`/api/users/profile/"${steamid}"`)).json();
          avatar = profile.avatar;
          avatarCache[steamid] = avatar;
        } catch (e) {
          avatar = "../icons/unknown.jpg";
        }

        playersString += `<img src="${avatar}" onmouseover="showTooltip('${username}')" onmouseleave="hideTooltip()"></img>`;

      }

      let modeString;
      switch (lobby.mode) {
        case "ffa": modeString = "Free For All"; break;
        default: modeString = "Unknown"; break;
      }

      output += `
  <div class="lobby-entry marginx">
    <p class="lobby-name">${safeName}</p>
    <p class="lobby-description">${modeString} - ${lobby.players.length} player${lobby.players.length === 1 ? "" : "s"}</p>
    <div class="lobby-players">${playersString}</div>
    <button class="lobby-button" onclick='joinLobby("${encodeURIComponent(name)}")'>Join Lobby</button>
  </div>
      `;

    }

    const lobbyList = document.querySelector("#lobby-list");
    lobbyList.innerHTML = output;

  };
  fetchLobbies();
  setInterval(fetchLobbies, 5000);

  const lobbySearch = document.querySelector("#lobby-search");
  lobbySearch.oninput = function () {

    const query = lobbySearch.value.trim().toLowerCase();
    const entries = lobbyList.getElementsByClassName("lobby-entry");

    for (let i = 0; i < entries.length; i ++) {

      const name = entries[i].getElementsByClassName("lobby-name")[0].innerHTML.toLowerCase();

      if (name.includes(query)) {
        entries[i].style.display = "";
      } else {
        entries[i].style.display = "none";
      }

    }

  };

  let cliKeysControl = false;
  let cliKeysTilde = false;

  const keyDownFunc = function (e) {
    if (e.key === "Control") cliKeysControl = true;
    if (e.key === "`") cliKeysTilde = true;
    if (cliKeysControl && cliKeysTilde) {

      const features = "popup=yes,width=640,height=400,left=20,top=20";

      const popupWindow = window.open("/admin/cli/index.html", "_blank", features);
      if (popupWindow) popupWindow.focus();

      cliKeysControl = false;
      cliKeysTilde = false;

    }
  };

  const keyUpFunc = function (e) {
    if (e.key === "Control") cliKeysControl = false;
    if (e.key === "`") cliKeysTilde = false;
  };

  window.addEventListener("keydown", keyDownFunc);
  window.addEventListener("keyup", keyUpFunc);

};
lobbyListInit();

function createLobbyPopup () {

  showPopup("Create a Lobby", `
    Name of the new lobby<br>
    <input id="new-lobby-name" type="text" placeholder="Lobby name" spellcheck="false" style="margin-top:5px"></input><br><br>
    Password (leave blank for none)<br>
    <input id="new-lobby-password" type="password" placeholder="Password" spellcheck="false" style="margin-top:5px"></input>
  `, POPUP_INFO, true);

  popupOnOkay = async function () {

    hidePopup();

    const name = encodeURIComponent(document.querySelector("#new-lobby-name").value.trim());
    const password = encodeURIComponent(document.querySelector("#new-lobby-password").value);

    const request = await fetch(`/api/lobbies/create/${name}/${password}`);

    if (request.status !== 200) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    } else {
      const data = await request.json();
      switch (data) {

        case "SUCCESS":
          window.open(`/live/lobby/#${name}`);
          window.location.reload();
          return;

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before joining a lobby.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_NAME": return showPopup("Invalid lobby name", "Please keep the lobby name to 50 characters or less.", POPUP_ERROR);
        case "ERR_EXISTS": return showPopup("Lobby name taken", "A lobby with this name already exists.", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

      }
    }

  };

}

async function joinLobby (name) {

  const isSecure = await (await fetch(`/api/lobbies/secure/${name}`)).json();

  if (!isSecure) {

    const request = await fetch(`/api/lobbies/join/${name}`);

    if (request.status !== 200) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    } else {
      const data = await request.json();
      switch (data) {

        case "ERR_EXISTS":
        case "SUCCESS":
          return window.open(`/live/lobby/#${name}`);

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before joining a lobby.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_NAME": return showPopup("Lobby not found", "An open lobby with this name does not exist.", POPUP_ERROR);
        case "ERR_PASSWORD": return showPopup("Incorrect password", "The password you provided was not correct. (But you didn't provide a password??)", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

      }
    }

  }

  showPopup("Join this Lobby", `
    Password required<br>
    <input id="join-lobby-password" type="password" placeholder="Password" spellcheck="false" style="margin-top:5px"></input>
  `, POPUP_INFO, true);

  popupOnOkay = async function () {

    hidePopup();

    const password = encodeURIComponent(document.querySelector("#join-lobby-password").value);
    const request = await fetch(`/api/lobbies/join/${name}/${password}`);

    if (request.status !== 200) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    } else {
      const data = await request.json();
      switch (data) {

        case "ERR_EXISTS":
        case "SUCCESS":
          return window.open(`/live/lobby/#${name}`);

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before joining a lobby.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_NAME": return showPopup("Lobby not found", "An open lobby with this name does not exist.", POPUP_ERROR);
        case "ERR_PASSWORD": return showPopup("Incorrect password", "The password you provided was not correct.", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

      }
    }

  };

}
