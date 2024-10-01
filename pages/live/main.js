// Store the currently relevant list of lobbies globally
var lobbies;

/**
 * Initializes the lobby list page.
 */
var lobbyListInit = async function () {

  // Change the login button to a logout button if the user is logged in
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

  const listContainer = document.querySelector("#lobby-list");
  const lobbySearch = document.querySelector("#lobby-search");

  /**
   * Update the lobby list HTML
   */
  const drawLobbies = function () {

    // Get the current search query
    const searchQuery = lobbySearch.value.trim().toLowerCase();

    // Clear the previous lobby list once the new one has been fetched
    listContainer.innerHTML = "";

    for (const lobbyid in lobbies) {

      const lobby = lobbies[lobbyid];

      if (!lobby.name.toLowerCase().includes(searchQuery)) continue;

      const safeName = lobby.name.replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")

      // Create the lobby entry as a DOM element
      const entry = document.createElement("div");
      entry.className = "lobby-entry marginx";
      listContainer.appendChild(entry);

      // Constrain the player list to 50% of the list entry width
      // Each profile picture is 44+5*2 pixels in width, we calculate the highest total
      const entryWidth = entry.getBoundingClientRect().width;
      const playerWidth = 44 + 5 * 2;
      const maxListPlayers = Math.floor(entryWidth / 2 / playerWidth);

      // Generate the player list
      let playersString = "";
      for (let i = 0; i < lobby.players.length; i ++) {

        // If the player list maximum is exceeded, replace the last entry with a numeric indicator
        if (i === maxListPlayers - 1 && lobby.players.length > maxListPlayers) {
          const hidden = lobby.players.length - maxListPlayers + 1;
          const tooltipString = `onmouseover="showTooltip('+${hidden} more player${hidden === 1 ? "" : "s"}')" onmouseleave="hideTooltip()"`;
          playersString += `<div ${tooltipString}>+${hidden}</div>`;
          break;
        }

        const steamid = lobby.players[i];
        const user = users[steamid];
        const username = user.name.replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
        const avatar = avatarCache[steamid];

        playersString += `<img src="${avatar}" onmouseover="showTooltip('${username}')" onmouseleave="hideTooltip()"></img>`;

      }

      // Generate the mode string
      let modeString;
      switch (lobby.mode) {
        case "ffa": modeString = "Free For All"; break;
        default: modeString = "Unknown"; break;
      }

      // Add the entry data to its respective element
      entry.innerHTML = `
        <p class="lobby-name">${safeName}</p>
        <p class="lobby-description">${modeString} - ${lobby.players.length} player${lobby.players.length === 1 ? "" : "s"}</p>
        <div class="lobby-players">${playersString}</div>
        <button class="lobby-button" onclick="joinLobby(\`${lobbyid}\`)">Join Lobby</button>
      `;

    }

  };

  // Redraw lobby list on window resize
  window.addEventListener("resize", drawLobbies);
  // Redraw lobby list on search bar input
  lobbySearch.addEventListener("input", drawLobbies);

  /**
   * Fetches the list of lobbies and calls drawLobbies
   */
  const fetchLobbies = async function () {

    // Fetch the list of lobbies
    lobbies = await (await fetch("/api/lobbies/list")).json();

    // Fetch user avatar links into avatarCache
    for (const lobbyid in lobbies) {

      for (const steamid of lobbies[lobbyid].players) {

        try {
          const profile = await (await fetch(`/api/users/profile/"${steamid}"`)).json();
          avatarCache[steamid] = profile.avatar;
        } catch (e) {
          avatarCache[steamid] = "../icons/unknown.jpg";
        }

      }
    }

    drawLobbies();

  };
  fetchLobbies();

  // Refresh the lobby list every 5 seconds
  setInterval(fetchLobbies, 5000);

  let cliKeysControl = false;
  let cliKeysTilde = false;

  // Handle CLI popup
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

/**
 * Shows a popup to create a new lobby.
 */
function createLobbyPopup () {

  // Show the popup
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

    // Fetch the api to create a new lobby
    const request = await fetch(`/api/lobbies/create/${name}/${password}`);

    // Handle the response and open the lobby window
    if (request.status !== 200) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    } else {
      const data = await request.json();
      switch (data) {

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before joining a lobby.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_NAME": return showPopup("Invalid lobby name", "Please keep the lobby name to 50 characters or less.", POPUP_ERROR);

        default: {
          if (data.startsWith("SUCCESS ")) return window.location.href = `/live/lobby/#${data.split("SUCCESS ")[1]}`;
          return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);
        }

      }
    }

  };

}

/**
 * Handles joining a lobby.
 *
 * @param {string} lobbyid
 */
async function joinLobby (lobbyid) {

  // Check if the lobby is password-protected
  const isSecure = await (await fetch(`/api/lobbies/secure/${lobbyid}`)).json();

  // Join the lobby if not
  if (!isSecure) {

    // Fetch the api to join the lobby
    const request = await fetch(`/api/lobbies/join/${lobbyid}`);

    // Handle the response and open the lobby window
    if (request.status !== 200) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    } else {
      const data = await request.json();
      switch (data) {

        case "SUCCESS":
          return window.location.href = `/live/lobby/#${lobbyid}`;

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before joining a lobby.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
        case "ERR_PASSWORD": return showPopup("Incorrect password", "The password you provided was not correct. (But you didn't provide a password??)", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

      }
    }

  }

  // Show the password prompt
  showPopup("Join this Lobby", `
    Password required<br>
    <input id="join-lobby-password" type="password" placeholder="Password" spellcheck="false" style="margin-top:5px"></input>
  `, POPUP_INFO, true);

  popupOnOkay = async function () {

    hidePopup();

    // Fetch the api to join the lobby
    const password = encodeURIComponent(document.querySelector("#join-lobby-password").value);
    const request = await fetch(`/api/lobbies/join/${lobbyid}/${password}`);

    // Handle the response and open the lobby window
    if (request.status !== 200) {
      return showPopup("Unknown error", "The server returned an unexpected response. Error code: " + request.status, POPUP_ERROR);
    } else {
      const data = await request.json();
      switch (data) {

        case "SUCCESS":
          return window.open(`/live/lobby/#${lobbyid}`);

        case "ERR_LOGIN": return showPopup("Not logged in", "Please log in via Steam before joining a lobby.", POPUP_ERROR);
        case "ERR_STEAMID": return showPopup("Unrecognized user", "Your SteamID is not present in the users database. WTF?", POPUP_ERROR);
        case "ERR_LOBBYID": return showPopup("Lobby not found", "An open lobby with this ID does not exist.", POPUP_ERROR);
        case "ERR_PASSWORD": return showPopup("Incorrect password", "The password you provided was not correct.", POPUP_ERROR);

        default: return showPopup("Unknown error", "The server returned an unexpected response: " + data, POPUP_ERROR);

      }
    }

  };

}
