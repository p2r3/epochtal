// Everything is loaded once, at once. Hopefully makes the frontend way snappier to use.

const [POPUP_INFO, POPUP_ERROR, POPUP_WARN] = [0, 1, 2];
function popupEscapeHandler (event) {
  if (event.key === "Escape") hidePopup();
}

const popup = document.querySelector("#global-popup");
const tooltip = document.querySelector("#global-tooltip");

const popupCloseEvent = new Event("close");

var showPopup = function (title, text, type = POPUP_INFO) {

  const titleElement = document.querySelector("#global-popup-title");
  const textElement = document.querySelector("#global-popup-text");

  titleElement.innerHTML = title;
  textElement.innerHTML = text;

  popup.style.opacity = 1;
  popup.style.pointerEvents = "auto";
  popup.style.transform = "translate(-50%, -50%)";

  switch (type) {
    case POPUP_INFO:
      popup.style.borderColor = "white";
      break;
    case POPUP_ERROR:
      popup.style.borderColor = "red";
      break;
    case POPUP_WARN:
      popup.style.borderColor = "#ff6400";
      break;
  
    default:
      popup.style.borderColor = "white";
      break;
  }

  document.addEventListener("keydown", popupEscapeHandler);

};

var hidePopup = function () {

  popup.style.opacity = 0;
  popup.style.pointerEvents = "none";
  popup.style.transform = "translate(-50%, 0)";

  document.removeEventListener("keydown", popupEscapeHandler);

  popup.dispatchEvent(popupCloseEvent);

};

var tooltipVisible = false;
var showTooltip = function (text) {

  tooltipVisible = true;

  tooltip.innerHTML = text;
  tooltip.style.opacity = 1;

};

var hideTooltip = function (text) {

  tooltipVisible = false;

  tooltip.style.opacity = 0;

};

window.addEventListener("mousemove", function (event) {

  if (!tooltipVisible) return;
  
  const {clientX, clientY} = event;
  tooltip.style.transform = `translate(${clientX}px, ${clientY}px)`;

});

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

      run.note = run.note.replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("\n", "<br>")
        .replaceAll("\r", "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");

      const username = user.name.replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("&", "&amp;");

      if (i !== 0 && run.time !== leaderboardData[i - 1].time) {
        placement ++;
      }

      const isArchive = leaderboardArchiveSelect.value !== "active";

      let downloadURL = `/api/archive/demo/${leaderboardArchiveSelect.value}/"${run.steamid}"/${category}`;
      if (run.proof === "video") {
        try {
          downloadURL = await (await fetch(downloadURL)).text();
        } catch (e) { } // Too bad ¯\_(ツ)_/¯
      }

      const portalCount = "portals" in run ? `, ${run.portals} portal${run.portals === 1 ? "" : "s"}` : "";

      const suffix = placement < 4 ? suffixes[placement - 1] : "th";

      output += `
<div class="lb-entry lb-rank${placement}">
  <p class="lb-text">${username}</p>
  <p class="lb-text font-light">${placement}${suffix} place in ${ticksToString(run.time)}${portalCount}</p>
  <div class="lb-icons">
    ${!isArchive && whoami && run.steamid === whoami.steamid ? `<i class="fa-solid fa-pen-to-square pointer" onmouseover="showTooltip('Edit comment')" onmouseleave="hideTooltip()" onclick="editComment('${category}')"></i>` : ""}
    ${!isArchive && whoami && run.steamid === whoami.steamid ? `<i class="fa-solid fa-trash pointer" onmouseover="showTooltip('Remove submission')" onmouseleave="hideTooltip()" onclick="removeRun('${category}')"></i>` : ""}
    ${run.segmented ? `<i class="fa-solid fa-link" onmouseover="showTooltip('Segmented submission')" onmouseleave="hideTooltip()"></i>` : ""}
    ${run.note ? `<i class="fa-solid fa-comment" onmouseover="showTooltip('${run.note}')" onmouseleave="hideTooltip()"></i>` : ""}
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

    showPopup("Edit run comment", `<textarea id="edit-note" cols="25" rows="3" placeholder="no comment">${run.note}</textarea>`);

    let submitEditFunction;
    submitEditFunction = async function () {

      popup.removeEventListener("close", submitEditFunction);

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

    popup.addEventListener("close", submitEditFunction);

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

    demoButton.innerHTML = demoFile.name;

  };

  const demoButton = document.querySelector("#submit-demo");
  demoButton.addEventListener("click", () => { fakeInput.click() });

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

    try {

      const response = await fetch(`/api/leaderboard/submit/${category}/${safeNote}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

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
      
        default:
          throw data;
      }

    } catch (e) {

      console.error(e);
      return showPopup("Unknown error", "An unexpected error occurred while submitting your speedrun. Check the JavaScript console for more info.", POPUP_ERROR);

    }

    leaderboard = await (await fetch("/api/leaderboard/get")).json();
    displayLeaderboard(leaderboardCategorySelect.value);

    return showPopup("Success", "Your run has been submitted!<br>Time: " + ticksToString(data));

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

    try {

      const response = await fetch(`/api/leaderboard/submitlink/${category}/${safeLink}/${safeNote}/${time}/${portals}`);
      const data = await response.json();

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
      
        default:
          throw data;
      }

    } catch (e) {

      console.error(e);
      return showPopup("Unknown error", "An unexpected error occurred while submitting your speedrun. Check the JavaScript console for more info.", POPUP_ERROR);
    
    }

    leaderboard = await (await fetch("/api/leaderboard/get")).json();
    displayLeaderboard(leaderboardCategorySelect.value);

    return showPopup("Success", "Your run has been submitted!<br>Time: " + ticksToString(data));

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
