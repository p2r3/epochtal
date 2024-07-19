// Everything is loaded once, at once. Hopefully makes the frontend way snappier to use.

const pageContent = document.querySelector("#page-content");
const header = document.querySelector("header");

var smoothScroll = function (queryString) {

  const element = document.querySelector(queryString);
  const bbox = element.getBoundingClientRect();

  const headerSize = header.getBoundingClientRect().height;

  if (bbox.height < window.innerHeight) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const offsetPosition = bbox.top + window.pageYOffset - headerSize;

  pageContent.scrollBy({
    top: offsetPosition,
    behavior: "smooth"
  });

};

function sanitizeStringJS (str) {
  return (
    str.replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "<br>")
    .replaceAll("\r", "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
  );
}

function sanitizeStringHTML (str) {
  return (
    str.replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("&", "&amp;")
  );
}

var homepageInit = async function () {

  var config = await (await fetch("/api/config/get")).json();
  var leaderboard = await (await fetch("/api/leaderboard/get")).json();
  const users = await (await fetch("/api/users/get")).json();
  const archives = await (await fetch("/api/archive/list")).json();
  const mapvotes = await (await fetch("/api/votes/get")).json();

  const whoami = await (await fetch("/api/users/whoami")).json();

  if (whoami !== null) {

    const loginButton = document.querySelector("#login-button");

    loginButton.innerHTML = "Log out";
    loginButton.onclick = function () {
      window.location.href = '/api/auth/logout';
    };

  }

  document.querySelector("#intro-week").innerHTML = config.number;

  const activeMapContainer = document.querySelector("#active-map");

  function updateActiveMap () {

    const map = config.map;
    const thumbnail = map.thumbnail.startsWith("http") ? map.thumbnail : `https://steamuserimages-a.akamaihd.net/ugc/${map.thumbnail}?impolicy=Letterbox&imw=640&imh=360`;

    activeMapContainer.innerHTML = `
      <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${map.id}" target="_blank">
        <img class="votes-image" alt="thumbnail" src="${thumbnail}">
        <p class="votes-text">
          ${map.title.trim()}<br>
          <i class="font-light votes-author">by ${map.author.trim()}</i>&nbsp;
          <span class="votes-color-up">${map.upvotes} <i class="fa-solid fa-thumbs-up"></i></span> <span class="votes-color-down">${map.downvotes} <i class="fa-solid fa-thumbs-down"></i></span>
        </p>
      </a>
    `;

  }
  updateActiveMap();

  const leaderboardCategorySelect = document.querySelector("#leaderboard-category-select");
  const leaderboardArchiveSelect = document.querySelector("#leaderboard-archive-select");

  function updateCategorySelect () {

    let output = "";
    for (let i = 0; i < config.categories.length; i ++) {

      const category = config.categories[i];
      output += `<option value="${category.name}" ${i === 0 ? 'selected=""' : ""}>${category.title}</option>`;

    }
    leaderboardCategorySelect.innerHTML = output;

  }
  updateCategorySelect();

  function updateArchiveSelect () {

    let output = "<option value='active' selected=''>active</option>";
    for (let i = 0; i < archives.length; i ++) {
      output += `<option value="${archives[i]}">${archives[i]}</option>`;
    }
    leaderboardArchiveSelect.innerHTML = output;

  }
  updateArchiveSelect();

  async function displayLeaderboard (category) {

    leaderboardCategorySelect.value = category;

    const categoryData = config.categories.find(curr => curr.name === category);
    const leaderboardData = leaderboard[categoryData.name];

    document.querySelector("#leaderboard-category").innerHTML = categoryData.title;

    if (!leaderboardData || leaderboardData.length === 0) {
      document.querySelector("#leaderboard-data").innerHTML = `
        <p class="center">
          The leaderboard for this category is empty.
        </p>
        <div style="height: 6vh"></div>`;
      return;
    }

    let output = "", placement = 1;
    const suffixes = ["st", "nd", "rd"];

    for (let i = 0; i < leaderboardData.length; i ++) {

      const run = leaderboardData[i];
      const user = users[run.steamid];

      const note = sanitizeStringJS(run.note);

      let username = user.name;
      if ((categoryData.coop && ("partners" in config && config.partners[run.steamid]) || run.partner)) {
        const partner = users[("partners" in config && config.partners[run.steamid]) ? config.partners[run.steamid] : run.partner];
        username += " & " + partner.name;
      }
      username = sanitizeStringHTML(username);

      if (i !== 0 && run.time !== leaderboardData[i - 1].time) {
        placement ++;
      }

      const isArchive = leaderboardArchiveSelect.value !== "active";

      let downloadURL = `/api/proof/archive/"${run.steamid}"/${category}/${leaderboardArchiveSelect.value}`;
      if (run.proof === "video") {
        try {
          downloadURL = await (await fetch(downloadURL)).text();
        } catch (e) { } // Too bad ¯\_(ツ)_/¯
      }

      const portalCount = ("portals" in run && categoryData.portals) ? `, ${run.portals} portal${run.portals === 1 ? "" : "s"}` : "";

      const suffix = ["st","nd","rd"][((placement + 90) % 100 - 10) % 10 - 1] || "th";

      output += `
<div class="lb-entry lb-rank${placement}">
  <p class="lb-text">${username}</p>
  <p class="lb-text font-light">${placement}${suffix} place in ${ticksToString(run.time)}${portalCount}</p>
  <div class="lb-icons">
    ${!isArchive && whoami && run.steamid === whoami.steamid ? `<i class="fa-solid fa-pen-to-square pointer" onmouseover="showTooltip('Edit comment')" onmouseleave="hideTooltip()" onclick="editComment('${category}')"></i>` : ""}
    ${!isArchive && whoami && run.steamid === whoami.steamid ? `<i class="fa-solid fa-trash pointer" onmouseover="showTooltip('Remove submission')" onmouseleave="hideTooltip()" onclick="removeRun('${category}')"></i>` : ""}
    ${run.segmented ? `<i class="fa-solid fa-link" onmouseover="showTooltip('Segmented submission')" onmouseleave="hideTooltip()"></i>` : ""}
    ${note ? `<i class="fa-solid fa-comment" onmouseover="showTooltip('${note}')" onmouseleave="hideTooltip()"></i>` : ""}
    ${run.proof ? `<a href='${downloadURL}' target="_blank"><i class="fa-solid fa-${run.proof === "demo" ? "file-arrow-down" : "video"}" onmouseover="showTooltip('${run.proof === "demo" ? "Download demo" : "Watch video"}')" onmouseleave="hideTooltip()"></i></a>` : ""}
  </div>
</div>`;

    }

    document.querySelector("#leaderboard-data").innerHTML = output;

  }
  displayLeaderboard("main");

  leaderboardCategorySelect.onchange = function () {
    displayLeaderboard(leaderboardCategorySelect.value);
  };

  leaderboardArchiveSelect.onchange = async function () {

    const archive = leaderboardArchiveSelect.value;

    if (archive === "active") {

      config = await (await fetch("/api/config/get")).json();
      leaderboard = await (await fetch("/api/leaderboard/get")).json();

    } else {

      config = await (await fetch(`/api/archive/config/${archive}`)).json();
      leaderboard = await (await fetch(`/api/archive/leaderboard/${archive}`)).json();

    }

    updateActiveMap();
    updateCategorySelect();
    displayLeaderboard("main");

  };

  var removeRunConfirm = null;
  window.removeRun = async function (category) {

    if (removeRunConfirm !== category) {
      showPopup("Are you sure?", "You are about to permanently delete this submission. Press the button again to confirm.", POPUP_WARN);
      removeRunConfirm = category;
      return;
    }
    removeRunConfirm = null;

    try {

      const response = await fetch("/api/leaderboard/remove/" + category);
      const data = await response.json();

      switch (data) {
        case "ERR_LOGIN":
          return showPopup("Not logged in", "Please log in via Steam before submitting runs.", POPUP_ERROR);
        case "ERR_NOTFOUND":
          return showPopup("Run not found", "You do not have a submission in this category.", POPUP_ERROR);
        case "ERR_LOCKED":
          return showPopup("Leaderboard locked", "The leaderboard for this category is locked.", POPUP_ERROR);
        case "ERR_CATEGORY":
          return showPopup("Invalid category", "The leaderboard for this category could not be found.", POPUP_ERROR);

        case "SUCCESS": {

          leaderboard = await (await fetch("/api/leaderboard/get")).json();
          displayLeaderboard(leaderboardCategorySelect.value);

          return showPopup("Success", "Your run has been removed!");

        }

        default:
          throw data;
      }

    } catch (e) {

      console.error(e);
      return showPopup("Unknown error", "An unexpected error occurred while removing your speedrun. Check the JavaScript console for more info.", POPUP_ERROR);

    }

  };

  window.editComment = function (category) {

    const run = leaderboard[category].find(curr => curr.steamid === whoami.steamid);

    showPopup("Edit run comment", `<textarea id="edit-note" cols="25" rows="3" placeholder="no comment">${sanitizeStringJS(run.note)}</textarea>`, POPUP_INFO, true);

    popupOnOkay = async function () {

      try {

        const note = document.querySelector("#edit-note").value.trim();
        const safeNote = encodeURIComponent(note);

        const response = await fetch(`/api/leaderboard/edit/${category}/${safeNote}`);
        const data = await response.json();

        switch (data) {
          case "ERR_LOGIN":
            return showPopup("Not logged in", "Please log in via Steam before submitting runs.", POPUP_ERROR);
          case "ERR_NOTFOUND":
            return showPopup("Run not found", "You do not have a submission in this category.", POPUP_ERROR);
          case "ERR_LOCKED":
            return showPopup("Leaderboard locked", "The leaderboard for this category is locked.", POPUP_ERROR);
          case "ERR_CATEGORY":
            return showPopup("Invalid category", "The leaderboard for this category could not be found.", POPUP_ERROR);
          case "ERR_NOTE":
            return showPopup("Comment too long", "Please keep your run comments to 200 characters or under.", POPUP_ERROR);

          case "SUCCESS": {

            leaderboard = await (await fetch("/api/leaderboard/get")).json();
            displayLeaderboard(leaderboardCategorySelect.value);

            return showPopup("Success", "Your run's comment has been changed!");

          }

          default:
            throw data;
        }

      } catch (e) {

        console.error(e);
        return showPopup("Unknown error", "An unexpected error occurred while editing your speedrun. Check the JavaScript console for more info.", POPUP_ERROR);

      }

    };

  };

  const linkContainer = document.querySelector("#submit-link-container");
  const linkInput = document.querySelector("#submit-link");
  const linkInfo = document.querySelector("#submit-link-info");

  const fakeInput = document.createElement("input");
  fakeInput.type = "file";

  let demoFile = null;

  linkInput.oninput = function () {

    if (demoFile) return;

    const empty = linkInput.value.trim() === "";
    linkInfo.style.display = empty ? "none" : "unset";

  };

  fakeInput.onchange = async function (evt) {

    demoFile = evt.target.files[0];
    fakeInput.remove();

    if (!demoFile) return;

    linkInfo.style.display = "none";
    linkContainer.style.display = "none";
    demoClearButton.style.display = "inline-block";

    demoButton.innerHTML = demoFile.name;

  };

  const demoButton = document.querySelector("#submit-demo");
  demoButton.addEventListener("click", () => { fakeInput.click() });

  const demoClearButton = document.querySelector("#submit-demo-clear");
  demoClearButton.addEventListener("click", function () {
    demoFile = null;
    demoButton.innerHTML = "Submit Demo File";
    linkContainer.style.display = "";
    demoClearButton.style.display = "none";
  });

  const categorySelect = document.querySelector("#submit-category");
  for (let i = 0; i < config.categories.length; i ++) {

    const { name, title } = config.categories[i];

    categorySelect.innerHTML += `<option value="${name}">${title}</option>`;

  }

  categorySelect.onchange = function () {

    const category = categorySelect.value;
    const portals = config.categories.find(function (curr) {
      return curr.name === category && curr.portals;
    });

    const input = document.querySelector("#submit-portals");
    input.style.display = portals ? "inline" : "none";

  }

  const noteInput = document.querySelector("#submit-note");
  const timeInput = document.querySelector("#submit-time");
  const portalsInput = document.querySelector("#submit-portals");

  async function submitDemo () {

    const formData = new FormData();
    formData.append("demo", demoFile);

    const category = categorySelect.value;
    if (!category) return showPopup("No category selected", "Please select a category to submit your speedrun to.", POPUP_ERROR);

    const note = noteInput.value.trim();
    if (note.length > 200) return showPopup("Comment too long", "Please keep your run comments to 200 characters or under.", POPUP_ERROR);

    const safeNote = encodeURIComponent(note);

    let data;
    try {

      const response = await fetch(`/api/leaderboard/submit/${category}/${safeNote}`, {
        method: "POST",
        body: formData,
      });
      data = await response.json();

      if (typeof data === "string") switch (data) {
        case "ERR_LOGIN":
          return showPopup("Not logged in", "Please log in via Steam before submitting runs.", POPUP_ERROR);
        case "ERR_NOTE":
          return showPopup("Comment too long", "Please keep your run comments to 200 characters or under.", POPUP_ERROR);
        case "ERR_ILLEGAL":
          return showPopup("Verification failed", "Your run failed to pass verification. Contact the organizers if you think this is a mistake.", POPUP_ERROR);
        case "ERR_STEAMID":
          return showPopup("SteamID mismatch", "This demo does not appear to belong to your Steam account.", POPUP_ERROR);
        case "ERR_LOCKED":
          return showPopup("Leaderboard locked", "The leaderboard for this category is locked.", POPUP_ERROR);
        case "ERR_TIME":
          return showPopup("Invalid time format", "The time you provided could not be parsed. Please provide time in the format \"min:sec.ms\".", POPUP_ERROR);
        case "ERR_PROOF":
          return showPopup("Invalid proof type", "This category does not accept demo submissions.", POPUP_ERROR);
        case "ERR_PORTALS":
          return showPopup("Invalid portal count", "The portal count could not be parsed.", POPUP_ERROR);
        case "ERR_NOTCOOP":
          return showPopup("Category not co-op", "You're trying to submit a co-op demo to a single player category.", POPUP_ERROR);
        case "ERR_PARTNER":
          return showPopup("Partner mismatch", "You cannot change partners during a week.", POPUP_ERROR);
        case "ERR_NOPARTNER":
          return showPopup("Partner required", "You're trying to submit a single player demo to a co-op category.", POPUP_ERROR);
        case "ERR_PARTNERLOCK":
          return showPopup("Category unavailable", "Submitting single player runs after playing co-op is not allowed. This is done to prevent route sharing.", POPUP_ERROR);

        default:
          throw data;
      }

    } catch (e) {

      console.error(e);
      return showPopup("Unknown error", "An unexpected error occurred while submitting your speedrun. Check the JavaScript console for more info.", POPUP_ERROR);

    }

    leaderboard = await (await fetch("/api/leaderboard/get")).json();
    displayLeaderboard(leaderboardCategorySelect.value);

    return showPopup("Success", "Your run has been submitted!<br>Time: " + ticksToString(data.time));

  }


  async function submitLink () {

    const link = linkInput.value.trim();

    if (!link) return showPopup("Empty submission", "Please provide either a demo file or a link to a YouTube video.", POPUP_ERROR);
    if (!link.includes("youtu")) return showPopup("Invalid link", "The link you provided doesn't look like a YouTube video.", POPUP_ERROR);

    const category = categorySelect.value;
    if (!category) return showPopup("No category selected", "Please select a category to submit your speedrun to.", POPUP_ERROR);

    const time = stringToTicks(timeInput.value.trim());
    let portals = parseInt(portalsInput.value.trim());

    if (isNaN(time)) return showPopup("Invalid time format", "The time you provided could not be parsed. Please provide time in the format \"min:sec.ms\".", POPUP_ERROR)
    if (isNaN(portals) || portals < 0) {
      if (portalsInput.style.display === "none") {
        portals = 0;
      } else {
        return showPopup("Invalid portal count", "The portal count you provided could not be parsed. Please provide a single positive integer.", POPUP_ERROR);
      }
    }

    const note = noteInput.value.trim();
    if (note.length > 200) return showPopup("Comment too long", "Please keep your run comments to 200 characters or under.", POPUP_ERROR);

    const safeLink = encodeURIComponent(link);
    const safeNote = encodeURIComponent(note);

    let data;
    try {

      const response = await fetch(`/api/leaderboard/submitlink/${category}/${safeLink}/${safeNote}/${time}/${portals}`);
      data = await response.json();

      if (typeof data === "string") switch (data) {
        case "ERR_LOGIN":
          return showPopup("Not logged in", "Please log in via Steam before submitting runs.", POPUP_ERROR);
        case "ERR_ILLEGAL":
          return showPopup("Verification failed", "Your run failed to pass verification. Contact the organizers if you think this is a mistake.", POPUP_ERROR);
        case "ERR_LOCKED":
          return showPopup("Leaderboard locked", "The leaderboard for this category is locked.", POPUP_ERROR);
        case "ERR_TIME":
          return showPopup("Invalid time format", "The time you provided could not be parsed. Please provide time in the format \"min:sec.ms\".", POPUP_ERROR);
        case "ERR_PROOF":
          return showPopup("Invalid proof type", "This category does not accept link submissions.", POPUP_ERROR);
        case "ERR_PORTALS":
          return showPopup("Invalid portal count", "The portal count you provided could not be parsed.", POPUP_ERROR);

        default:
          throw data;
      }

    } catch (e) {

      console.error(e);
      return showPopup("Unknown error", "An unexpected error occurred while submitting your speedrun. Check the JavaScript console for more info.", POPUP_ERROR);

    }

    leaderboard = await (await fetch("/api/leaderboard/get")).json();
    displayLeaderboard(leaderboardCategorySelect.value);

    return showPopup("Success", "Your run has been submitted!<br>Time: " + ticksToString(data.time));

  }

  const submitButton = document.querySelector("#submit-button");
  submitButton.onclick = async function () {

    submitButton.innerHTML = "Submitting...";
    submitButton.style.pointerEvents = "none";

    if (demoFile) await submitDemo();
    else await submitLink();

    submitButton.innerHTML = "Submit";
    submitButton.style.pointerEvents = "auto";

  }

  pageContent.ondragover = function (e) {
    e.preventDefault();
  };

  pageContent.ondrop = function (e) {
    e.preventDefault();

    const items = e.dataTransfer.items;

    if (items[0].kind !== "file") return;
    const file = items[0].getAsFile();

    if (!file.name.endsWith(".dem")) return;
    demoFile = file;

    linkInfo.style.display = "none";
    linkContainer.style.display = "none";

    demoButton.innerHTML = demoFile.name;

    smoothScroll('#submit');

  };

  const votesContainer = document.querySelector("#votes-container");
  let votesOutput = "";

  for (let i = 0; i < config.votingmaps.length; i ++) {

    const map = config.votingmaps[i];
    let thumbnail = map.thumbnail.startsWith("http") ? map.thumbnail : "https://steamuserimages-a.akamaihd.net/ugc/" + map.thumbnail + "?impolicy=Letterbox&imw=640&imh=360";

    votesOutput += `
      <div class="votes-entry">
        <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${map.id}" target="_blank">
          <img class="votes-image" alt="thumbnail" src="${thumbnail}">
          <p class="votes-text">
            ${map.title.trim()}<br>
            <i class="font-light">by ${map.author.trim()}</i>
          </p>
        </a>
        <div class="votes-buttons">
          <img id="votes-button${i}-up" alt="upvote" class="votes-up ${mapvotes[i] === 1 ? "votes-selected" : ""}" src="/icons/arrow.png" onclick="submitVote(${i}, 1)">
          <img id="votes-button${i}-down" alt="downvote" ${mapvotes[i] === -1 ? 'class="votes-selected"' : ""} src="/icons/arrow.png" onclick="submitVote(${i}, -1)">
        </div>
      </div>
    `;

  }

  votesContainer.innerHTML = votesOutput;

  window.submitVote = async function (map, vote) {

    try {

      const response = await fetch(`/api/votes/${vote === 1 ? "upvote" : "downvote"}/${map}`);
      const data = await response.json();

      if (data !== "SUCCESS") switch (data) {
        case "ERR_LOGIN":
          return showPopup("Not logged in", "Please log in via Steam before voting for maps.", POPUP_ERROR);
        case "ERR_LOCKED":
          return showPopup("Voting locked", "Voting for next week's map has concluded.", POPUP_ERROR);
        case "ERR_MAP":
          return showPopup("Invalid map", "The map you voted for is out of range. Somehow.", POPUP_ERROR);

        default:
          throw data;
      }

      const buttonUp = document.querySelector(`#votes-button${map}-up`);
      const buttonDown = document.querySelector(`#votes-button${map}-down`);

      buttonDown.className = buttonDown.className.replace("votes-selected", "");
      buttonUp.className = buttonUp.className.replace("votes-selected", "");

      if (vote === 1) {
        buttonUp.className = buttonUp.className + "votes-selected";
      } else {
        buttonDown.className = buttonDown.className + "votes-selected";
      }

    } catch (e) {

      console.error(e);
      return showPopup("Unknown error", "An unexpected error occurred while submitting your vote. Check the JavaScript console for more info.", POPUP_ERROR);

    }

  };

  const suggestMapButton = document.querySelector("#suggest-map-button");
  suggestMapButton.onclick = function () {

    showPopup("Suggest a Map", `<p>Suggest a map to the tournament.
      Every submission will be considered by the curation algorithm until it appears in the voting top 5 list.</p>
      <input type="text" placeholder="Workshop Link" id="suggest-input"></input>`, POPUP_INFO, true);

    popupOnOkay = async function () {

      const suggestInput = document.querySelector("#suggest-input");
      const mapid = suggestInput.value.trim().toLowerCase().split("https://steamcommunity.com/sharedfiles/filedetails/?id=").pop().split("?")[0];

      if (!mapid || isNaN(mapid)) {
        showPopup("Invalid link", "The workshop link you provided could not be parsed.", POPUP_ERROR);
        return;
      }

      hidePopup();

      try {

        const response = await fetch(`/api/workshopper/suggest/"${mapid}"`);
        const data = await response.json();

        if (data !== "SUCCESS") switch (data) {
          case "ERR_LOGIN":
            return showPopup("Not logged in", "Please log in via Steam before suggesting maps.", POPUP_ERROR);
          case "ERR_MAPID":
            return showPopup("Invalid link", "The workshop link you provided could not be parsed.", POPUP_ERROR);
          case "ERR_EXISTS":
            return showPopup("Already suggested", "This map has already been suggested to the tournament.", POPUP_ERROR);

          default:
            throw data;
        }

        return showPopup("Success", "Your map has been suggested for the tournament.");

      } catch (e) {

        console.error(e);
        return showPopup("Unknown error", "An unexpected error occurred while submitting the map. Check the JavaScript console for more info.", POPUP_ERROR);

      }

    };

  };

  const playersContainer = document.querySelector("#players-container");
  const playersSearch = document.querySelector("#players-search");

  const sortedUsers = [];
  for (const steamid in users) {
    const user = JSON.parse(JSON.stringify(users[steamid]));
    user.steamid = steamid;
    if (user.points === null) user.points = -Infinity;
    sortedUsers.push(user);
  }
  sortedUsers.sort((a, b) => b.points - a.points);

  let output = "", placement = 1;
  for (let i = 0; i < sortedUsers.length; i ++) {

    const user = sortedUsers[i];

    const username = sanitizeStringHTML(user.name);

    if (i !== 0 && user.points !== sortedUsers[i - 1].points) {
      placement ++;
    }

    let pointsString = "Points hidden";
    const outputPoints = Math.round(user.points);
    if (user.points !== -Infinity) pointsString = `${outputPoints} point${outputPoints === 1 ? "" : "s"}`;

    output += `<a href="https://epochtal.p2r3.com/profile/#${user.steamid}" target="_blank" style="color:white;text-decoration:none"><div class="lb-entry lb-rank${placement}">
      <p class="lb-text">${username}</p>
      <p class="lb-text font-light">${pointsString}</p>
    </div></a>`;

  }
  playersContainer.innerHTML = output;

  playersSearch.oninput = function () {

    const query = playersSearch.value.trim().toLowerCase();
    const entries = playersContainer.getElementsByClassName("lb-entry");

    for (let i = 0; i < entries.length; i ++) {

      const name = entries[i].getElementsByClassName("lb-text")[0].innerHTML.toLowerCase();

      if (name.includes(query)) {
        entries[i].style.display = "";
      } else {
        entries[i].style.display = "none";
      }

    }

  };

  const powerSavingSwitch = document.querySelector("#power-saving");

  if (localStorage.getItem("powerSaving") === "on") {
    powerSavingSwitch.checked = true;
  } else {
    powerSavingSwitch.checked = false;
  }

  powerSavingSwitch.onchange = function () {
    if (powerSavingSwitch.checked) {
      localStorage.setItem("powerSaving", "on");
      document.querySelector("#bg-anim").remove();
    } else {
      localStorage.setItem("powerSaving", "off");
      window.location.reload();
    }
  };

  if (window.location.href.endsWith("#404")) {
    showPopup("Not found", "The page you were trying to access does not exist. You've been brought back to the homepage.", POPUP_ERROR);
  }

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

let homepageInitAttempts = 0;
const homepageInitAttemptsMax = 5;

var tryHomepageInit = async function () {
  try {
    await homepageInit();
  } catch (e) {

    console.log("Caught error during homepage initialization:");
    console.error(e);

    homepageInitAttempts ++;
    if (homepageInitAttempts < homepageInitAttemptsMax) {
      console.log(`Retrying... (${homepageInitAttempts}/${homepageInitAttemptsMax})`);
      tryHomepageInit();
    } else {
      console.log(`Reached max retry attempts (${homepageInitAttempts}/${homepageInitAttemptsMax})`);
    }

  }
}
tryHomepageInit();
