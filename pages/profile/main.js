/**
 * Decode the player profile log from a buffer
 *
 * @param {Array} buffer The buffer to decode
 * @param {string[]} categoryList The list of categories
 * @returns {Object[]} The decoded log
 */
function decodeLog (buffer, categoryList) {

  const log = [];

  // each entry is 11 bytes long
  for (let i = 0; i < buffer.length; i += 10) {

    const entry = {};

    // 1 byte - category index
    entry.category = categoryList[buffer[i]];

    // 4 bytes - run time in ticks
    entry.time = 0;
    for (let j = 0; j < 4; j ++) {
      entry.time += buffer[i + 1 + j] * Math.pow(256, 3 - j);
    }

    // 1 byte - portal count
    entry.portals = buffer[i + 5];

    // 4 bytes - seconds since start of week 0
    entry.timestamp = 0;
    for (let j = 0; j < 4; j ++) {
      entry.timestamp += buffer[i + 6 + j] * Math.pow(256, 3 - j);
    }

    log.push(entry);

  }

  return log;

}

var profileSteamID = window.location.href.split("#")[1].split("/")[0].split("?")[0].split("&")[0];

/**
 * Open the Steam profile of the user
 */
function openSteamProfile () {
  window.open(`https://steamcommunity.com/profiles/${profileSteamID}`, "_blank");
}

/**
 * Open the Steam profile of the user
 */
var profilePageInit = async function () {

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

  // Refresh when page url changes
  window.addEventListener("hashchange", function(){
    window.location.reload();
  });

  // Setup the profile page
  const profileUser = users[profileSteamID];
  const profileUserData = await (await fetch(`/api/users/profile/"${profileSteamID}"`)).json();

  const graphTitle = document.querySelector("#profile-graph-title");
  graphTitle.innerHTML = `<img src="${profileUserData.avatar}" id="profile-avatar">${profileUser.name}'s Player Profile`;

  const canvas = document.querySelector("#profile-graph");
  let bbox = canvas.getBoundingClientRect();

  const graphLegend = document.querySelector("#profile-graph-legend");
  const graphLegendText = document.querySelector("#profile-graph-legend-text");
  const graphLegendDropdown = document.querySelector("#profile-graph-legend-dropdown");
  const graphLegendBBox = graphLegend.getBoundingClientRect();
  graphLegend.style.transform = `translate(${bbox.left}px, ${bbox.top}px)`;
  graphLegendDropdown.style.transform = `translate(calc(${bbox.left + graphLegendBBox.left + graphLegendBBox.width / 2}px - 50%), ${bbox.top + graphLegendBBox.bottom}px)`;

  // Update the graph when the window is resized
  window.onresize = function () {
    bbox = canvas.getBoundingClientRect();
    graphLegend.style.transform = `translate(${bbox.left}px, ${bbox.top}px)`;
    graphLegendDropdown.style.transform = `translate(calc(${bbox.left + graphLegendBBox.left + graphLegendBBox.width / 2}px - 50%), ${bbox.top + graphLegendBBox.bottom}px)`;
    generateGraph();
  };

  var profileLog, leaderboards = {};

  /**
   * Fetch the profile log of the user
   *
   * @returns {unknown} A promise that resolves when the profile log is fetched
   */
  async function fetchProfileLog () {

    // Fetch the actual profile log
    const request = await fetch(`/api/users/profilelog/"${profileSteamID}"`);
    if (request.status === 200) {
      const buffer = new Uint8Array(await request.arrayBuffer());
      profileLog = decodeLog(buffer, profileUserData.categories);
    } else if (request.status === 204) {
      profileLog = [];
    } else {
      return showPopup("Unknown error", "An unexpected error occurred while fetching the profile log. Check the JavaScript console for more info.", POPUP_ERROR);
    }

    // Parse the profile log into leaderboards
    for (let i = 0; i < profileLog.length; i ++) {

      const week = Math.floor(profileLog[i].timestamp / 604800);
      const category = profileLog[i].category;

      if (!(week in leaderboards)) leaderboards[week] = {};
      if (!(category in leaderboards[week])) leaderboards[week][category] = [];

      leaderboards[week][category].push(profileLog[i]);

    }

    // Sort the leaderboards by timestamp
    for (const week in leaderboards) {
      for (const category in leaderboards[week]) {
        leaderboards[week][category].sort(function (a, b) {
          return a.timestamp - b.timestamp;
        });
      }
    }

  }
  await fetchProfileLog();

  const graphTypes = ["points over time", "participation"];
  window.selectedGraphType = 0;

  // Generate the graph
  window.generateGraph = async function () {

    graphLegendText.innerHTML = graphTypes[selectedGraphType];

    // Setup graph type dropdown
    let dropdownOutput = "";
    for (let i = 0; i < graphTypes.length; i ++) {
      if (i === selectedGraphType) continue;
      dropdownOutput += `<p onclick="selectedGraphType=${i};generateGraph()">${graphTypes[i]}</p>`
    }
    graphLegendDropdown.innerHTML = dropdownOutput;

    // Fill the graph with data
    let data, startOffset = null, hiddenUntil = null;
    switch (graphTypes[selectedGraphType]) {

      case "points over time": {

        const { weeks, statistics } = profileUserData;

        data = new Array(weeks[weeks.length - 1]).fill(1000);
        endOffset = 0;

        // Calculate the total points for each week
        let totalPoints = 1000, lastDataPoint = 1000, weeksIn = 0, runsIn = 0;
        for (let i = weeks[0] - 1; i < data.length; i ++) {

          // Copy the last data point if the week is not in the statistics
          if (i + 1 !== weeks[weeksIn]) {
            data[i] = lastDataPoint;
            continue;
          }

          // Calculate the data point for this week
          const currDataPoint = statistics[weeksIn];
          for (let i = 0; i < currDataPoint.length; i ++) {
            totalPoints += currDataPoint[i];
            runsIn ++;
          }

          // Only show the data point if there are at least 10 runs
          if (runsIn >= 10) {
            if (hiddenUntil === null) hiddenUntil = i;
            if (totalPoints < 0) lastDataPoint = -100 / totalPoints;
            else lastDataPoint = totalPoints + 100;
          }
          data[i] = lastDataPoint;

          weeksIn ++;

        }

        for (let i = weeks[0] - 1; i < hiddenUntil; i ++) {
          data[i] = data[hiddenUntil];
        }
        startOffset = weeks[0] - 1;
        hiddenUntil -= startOffset;
        data = data.slice(startOffset);

        break;

      }

      case "participation": {

        // Find the first and last week
        let first = Infinity, last = -Infinity;
        for (const week in leaderboards) {
          const weeknum = Number(week);
          if (weeknum < first) first = weeknum;
          if (weeknum > last) last = weeknum;
        }

        data = new Array(Math.max(last, 0)).fill(0);

        // For each week, count the number of submissions
        for (let i = first - 1; i <= last; i ++) {

          if (!(i in leaderboards)) continue;

          // Count the number of submissions in this week
          let submissions = 0;
          for (const category in leaderboards[i]) {
            submissions += leaderboards[i][category].length;
          }
          if (startOffset === null && submissions !== 0) startOffset = i;
          data[i] = submissions;

        }

        // Slice the data to start from the first week with submissions
        data = data.slice(startOffset);

        break;

      }

    }

    // Clone the last element twice to get the bezier
    data.push(data[data.length - 1]);
    data.push(data[data.length - 1]);

    canvas.width = bbox.width;
    canvas.height = bbox.height;

    const ctx = canvas.getContext("2d");

    const margin = 20;
    const width = canvas.width - 2 * margin;
    const height = canvas.height - 2 * margin;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate the step size for x and y axes
    const xStep = width / (data.length - 1);
    const yStep = height / (Math.max(...data) - Math.min(...data));

    // Start drawing the graph
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    // Move to the initial point
    ctx.moveTo(margin, canvas.height - margin - (data[0] - Math.min(...data)) * yStep);

    // Draw smooth curve using Bézier curves
    for (let i = 1; i < data.length - 2; i ++) {

      const x1 = margin + i * xStep;
      const y1 = canvas.height - margin - (data[i] - Math.min(...data)) * yStep;
      const x2 = margin + (i + 1) * xStep;
      const y2 = canvas.height - margin - (data[i + 1] - Math.min(...data)) * yStep;
      const xc = (x1 + x2) / 2;
      const yc = (y1 + y2) / 2;

      ctx.quadraticCurveTo(x1, y1, xc, yc);

    }

    // Draw the last two data points with straight lines
    ctx.lineTo(margin + (data.length - 1) * xStep, canvas.height - margin - (data[data.length - 1] - Math.min(...data)) * yStep);
    ctx.stroke();

    const hoverInfo = document.querySelector("#profile-graph-hover");
    const hoverLine = document.querySelector("#profile-graph-line");

    // Add event listener for mousemove to display index on hover
    canvas.addEventListener("mousemove", function (event) {

      const mouseX = event.clientX - bbox.left;
      const mouseY = event.clientY - bbox.top;

      // Calculate the index of the data point under the mouse
      const uncappedIndex = Math.round((mouseX - margin) / xStep);
      const index = Math.max(Math.min(uncappedIndex, data.length - 1), 0);

      // Display the index in hoverInfo
      const dataPoint = Math.round(data[index]);
      if (selectedGraphType === 0) {
        if (index < hiddenUntil) hoverInfo.innerHTML = `Points hidden on Week ${startOffset + index + 1}`;
        else hoverInfo.innerHTML = `${dataPoint} Point${dataPoint === 1 ? "" : "s"} on Week ${startOffset + index + 1}`;
      } else if (selectedGraphType === 1) {
        hoverInfo.innerHTML = `${dataPoint} Submission${dataPoint === 1 ? "" : "s"} on Week ${startOffset + index + 1}`;
      }

      // Update the position of hoverInfo and hoverLine
      hoverInfo.style.transform = `translate(${Math.round((mouseX - margin) / xStep) * xStep + bbox.left + margin}px, calc(${event.clientY - 10}px - 100%))`;
      hoverLine.style.transform = `translate(${Math.round((mouseX - margin) / xStep) * xStep + bbox.left + margin}px, ${bbox.top}px)`;

      // Control opacity if within margins
      if (uncappedIndex < 0 || uncappedIndex > data.length - 3) {
        hoverLine.style.opacity = 0;
        hoverInfo.style.opacity = 0;
      } else {
        hoverLine.style.opacity = 1;
        hoverInfo.style.opacity = 1;
      }
    });

    canvas.addEventListener("mouseout", () => {
      hoverInfo.style.opacity = 0;
      hoverLine.style.opacity = 0;
    });

  }
  generateGraph();

  // Calculate the number of submissions in each category
  const categorySubmissions = [];
  for (const week in leaderboards) {
    for (const category in leaderboards[week]) {

      // Find the index of the category in categorySubmissions
      let index = categorySubmissions.findIndex(function (curr) {
        return curr.category === category;
      });

      // Add the category to categorySubmissions if it doesn't exist
      if (index === -1) {
        index = categorySubmissions.length;
        categorySubmissions.push({ category, submissions: 0 });
      }

      // Add the number of submissions in this category
      categorySubmissions[index].submissions += leaderboards[week][category].length;

    }
  }

  // Sort the categorySubmissions by number of submissions
  categorySubmissions.sort(function(a, b) {
    return b.submissions - a.submissions;
  });

  // Calculate the rank of the user
  let rank = 1;
  for (const steamid in users) {
    const user = users[steamid];
    if (user === profileUser) continue;
    if (user.runs < 10) continue;
    if (user.points > profileUser.points) rank ++;
  }

  const statsText = document.querySelector("#profile-stats-text");

  // Display the stats of the user
  if (profileLog.length === 0) {

    statsText.innerHTML = "This user has not yet submitted a run to the tournament.";

  } else {

    const startedWeek = Math.floor(profileLog[0].timestamp / 604800) + 1;
    const endedWeek = Math.floor(profileLog[profileLog.length - 1].timestamp / 604800) + 1;

    let scoredRuns = 0;
    const { statistics } = profileUserData;
    for (let i = 0; i < statistics.length; i ++) {
      scoredRuns += statistics[i].length;
    }

    let statsTextOutput = `
      <h3>Rank #${rank} out of ${Object.keys(users).length} players</h3>
      &nbsp;•&nbsp;&nbsp;${profileUser.points === null ? "Points hidden - not enough runs" : `<b>${profileUser.points.toFixed(2)}</b> points`}<br>
      &nbsp;•&nbsp;&nbsp;Joined on week ${startedWeek}, last submitted on week ${endedWeek}<br>
      <br>
      &nbsp;•&nbsp;&nbsp;${scoredRuns} Scored Runs<br>
      &nbsp;•&nbsp;&nbsp;${profileLog.length} Total Submissions<br>
      <br>
    `;

    for (let i = 0; i < categorySubmissions.length; i ++) {
      const { submissions, category } = categorySubmissions[i];
      statsTextOutput += `&nbsp;•&nbsp;&nbsp;<b>${submissions}</b> in category <b>${category}</b><br>`;
    }

    statsText.innerHTML = statsTextOutput;

  }


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
profilePageInit();
