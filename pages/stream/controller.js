const controllerInit = async function () {

  // Pre-fetch required resources
  const whoami = await (await fetch("/api/users/whoami")).json();
  const leaderboard = await (await fetch("/api/leaderboard/get")).json();
  const config = await (await fetch("/api/config/get")).json();
  const users = await (await fetch("/api/users/get")).json();

  // Create the stream controller event topic if it doesn't exist
  await fetch("/util/events/create/streamController", { method: "POST" });
  // Connect to the event WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const controllerSocket = new WebSocket(`${protocol}://${window.location.host}/api/events/connect`);
  controllerSocket.onopen = async function (event) {
    const token = await (await fetch("/api/events/auth/streamController")).json();
    controllerSocket.send(token);
  };
  // Every 30 seconds, send an empty object as a sort of heartbeat ping
  setInterval(() => controllerSocket.send("{}"), 30000);

  /**
   * Sends WebSocket events to the stream controller event topic, which the UI, game, and controller listen to
   * @param {unknown} data Data to send, converted to a JSON string
   */
  window.sendToController = async function (data) {

    const dataString = encodeURIComponent(JSON.stringify(data));
    await fetch(`/util/events/send/streamController/${dataString}`, { method: "POST" });

  };

  // HACK: i forgot that the game client needs keepalives too lol
  setInterval(function () {
    window.sendToController({ type: "ping" });
  }, 30000);

  const playRunButton = document.querySelector("#button-play");
  /**
   * Sends a request to display the specified run details on-stream
   *
   * @param {string} category Name of the category in which the run is
   * @param {string} steamid SteamID of the respective runner
   * @param {"demo"|"video"|null} proof Run proof type
   */
  window.selectRunner = function (category, steamid, proof) {

    window.sendToController({
      action: "run",
      category, steamid
    });

    // Enable the "Play Selected Run" button
    playRunButton.style.pointerEvents = "auto";
    playRunButton.style.opacity = 1;

    // Define what happens when this run gets played back
    window.playSelectedRun = async function () {

      if (proof === "demo") {
        window.sendToController({ type: "cmd", value: `playdemo tournament/${steamid}_${category}` });
        window.sendToController({ action: "play" });
      } else {
        const link = await (await fetch(`/api/proof/download/"${steamid}"/${category}`)).text();
        videoControlsContainer.style.display = "";
        window.sendToController({ action: "play", link });
      }

    };

  };

  /**
   * Sends a request to scroll the leaderboard to have the specified runner on-screen
   *
   * @param {string} category Name of the category in which the run is
   * @param {string} steamid SteamID of the respective runner
   */
  window.scrollToRunner = function (category, steamid) {

    window.sendToController({
      action: "scroll",
      category, steamid
    });

  };

  // Sends a request to display the leaderboard on-stream
  window.returnToLeaderboard = async function () {

    window.sendToController({ action: "start" });
    window.sendToController({ type: "cmd", value: "stopdemo" });

    // Disable the "Play Selected Run" button
    playRunButton.style.pointerEvents = "none";
    playRunButton.style.opacity = 0.5;

    videoControlsContainer.style.display = "none";

  };

  // Generates and copies a token for the game client
  window.copyToken = async function () {

    const token = await (await fetch(`/api/events/auth/streamController`)).json();
    navigator.clipboard.writeText(`echo ws:${token}`);

    return showPopup("Token copied", "A new token has been copied to your clipboard. It is valid for 30 seconds, starting now.");

  };

  const leaderboardContainer = document.querySelector("#controller-leaderboard");
  /**
   * Sets up or updates the leaderboard display
   * @param {string} category Name of the category for which to display the leaderboard
   */
  const updateLeaderboard = async function (category) {

    // Get more data about the selected category to choose what to display
    const categoryData = config.categories.find(c => c.name === category);

    let prevTime = null;

    // Iterate over the leaderboard in reverse to calculate deltas more easily
    let output = "";
    for (let i = leaderboard[category].length - 1; i >= 0; i --) {

      const run = leaderboard[category][i];

      // Essential run info
      const placement = run.placement;
      const player = toHTMLString(users[run.steamid].name);
      const time = ticksToString(run.time);
      const proof = await (await fetch(`/util/proof/type/"${run.steamid}"/${category}`, { method: "POST" })).json();
      // Conditional run info
      const portals = categoryData.portals ? run.portals : null;
      const partner = categoryData.coop ? users[config.partners[run.steamid]].name : null;
      const delta = (!categoryData.portals && prevTime) ? ticksToString(prevTime - run.time) : null;

      prevTime = run.time;

      output = `
        <a style="color:white;text-decoration:none"
        href="javascript:selectRunner('${category}', '${run.steamid}', '${proof}')"
        ${run.note ? `onmouseover="showTooltip(\`${toHTMLString(run.note)}\`)"` : ""}
        onmouseleave="hideTooltip()">

        #${placement} -
        <b>${player}</b>
        ${partner === null ? "" : ` and <b>${partner}</b>`}
        in ${time}
        ${portals === null ? "" : ` | ${portals}p`}
        <span class="font-light">
          ${delta === null ? "" : ` (-${delta})`}
          ${proof}
        </span>

        </a>
        &nbsp;<i class="fa-solid fa-arrow-down-short-wide" style="cursor:pointer" onclick="scrollToRunner('${category}', '${run.steamid}')" title="Scroll into view"></i>
        <br>` + output;

    }
    leaderboardContainer.innerHTML = output;

  };
  await updateLeaderboard("main");

  // Set up the category dropdown
  const categoriesOptions = document.querySelector("#controller-categories");
  categoriesOptions.onchange = async function () {

    const newCategory = categoriesOptions.value;

    window.sendToController({
      action: "category",
      name: newCategory
    });

    await updateLeaderboard(newCategory);

  };

  // Fill the category dropdown with options
  for (const category of config.categories) {
    // Skip categories that don't have any runs
    if (!(category.name in leaderboard) || leaderboard[category.name].length === 0) continue;

    categoriesOptions.innerHTML += `<option value="${category.name}">${category.title}</option>`;

  }

  // Set up basic audio controls
  const musicPlayPauseButton = document.querySelector("#controller-music-playpause");
  const musicSkipButton = document.querySelector("#controller-music-skip");
  const musicNowPlaying = document.querySelector("#controller-music-nowplaying");

  musicPlayPauseButton.onclick = function () {

    window.sendToController({ action: "musicPause" });

    if (musicPlayPauseButton.className === "fa-solid fa-pause") {
      musicPlayPauseButton.className = "fa-solid fa-play";
    } else {
      musicPlayPauseButton.className = "fa-solid fa-pause";
    }

  };

  musicSkipButton.onclick = function () {

    window.sendToController({ action: "musicSkip" });
    musicPlayPauseButton.className = "fa-solid fa-pause";

  };

  // Set up video controls
  const videoControlsContainer = document.querySelector("#yt-controls");
  const videoRewind = document.querySelector("#yt-rewind");
  const videoPlaypause = document.querySelector("#yt-playpause");
  const videoFastForward = document.querySelector("#yt-fastforward");
  const videoVolumeIcon = document.querySelector("#yt-volume-icon");
  const videoVolumeSlider = document.querySelector("#yt-volume-slider");
  const videoTimeString = document.querySelector("#yt-time-string");
  const videoSeekBar = document.querySelector("#yt-seek");

  videoControlsContainer.style.display = "none";
  videoRewind.onclick = function () {

    window.sendToController({ action: "ytRewind" });

  };
  videoPlaypause.onclick = function () {

    window.sendToController({ action: "ytPlaypause" });

  };
  videoFastForward.onclick = function () {

    window.sendToController({ action: "ytFastForward" });

  };
  videoVolumeSlider.oninput = function () {

    window.sendToController({ action: "ytVolume", volume: parseInt(this.value) });

  };
  videoSeekBar.oninput = function () {

    window.sendToController({ action: "ytSeek", seek: parseFloat(this.value) });

  };

  /**
   * Handles messages sent from the stream UI
   * @param {unknown} event The WebSocket message event
   */
  const controllerMessageHandler = async function (event) {

    const data = JSON.parse(event.data);
    // Messages intended for the controller will have an "update" key
    if (!("update" in data)) return;

    switch (data.update) {

      case "musicName": {
        musicNowPlaying.innerHTML = `Now playing: <b>${data.trackname}</b>`;
        return;
      }
      case "ytVolume": {
        videoVolumeSlider.value = data.volume;
        if (data.volume === 0) {
          videoVolumeIcon.className = "fa-solid fa-volume-xmark";
        } else if (data.volume < 33) {
          videoVolumeIcon.className = "fa-solid fa-volume-off";
        } else if (data.volume < 66) {
          videoVolumeIcon.className = "fa-solid fa-volume-low";
        } else {
          videoVolumeIcon.className = "fa-solid fa-volume-high";
        }
        return;
      }
      case "ytTime": {
        videoSeekBar.value = data.fraction;
        videoTimeString.innerHTML = data.string;
        return;
      }
      case "ytPlaypause": {
        if(data.isPlaying) {
          videoPlaypause.className = "fa-solid fa-pause";
        } else {
          videoPlaypause.className = "fa-solid fa-play";
        }
        return;
      }

    }
  };
  controllerSocket.addEventListener("message", controllerMessageHandler);

};
controllerInit();
