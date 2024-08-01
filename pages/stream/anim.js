/**
 * Counts the amount of unique runners and categories
 *
 * @param {object} leaderboard The full leaderboard (leaderboard.json)
 * @returns {object} Amount of runners, categories, and TAS runs
 */
const countRunners = function (leaderboard) {

  const playerList = [];
  let runners = 0, categories = 0, tas = 0;
  for (const category in leaderboard) {

    if (leaderboard[category].length === 0) continue;
    categories ++;

    for (const run of leaderboard[category]) {
      if (playerList.includes(run.steamid)) continue;
      playerList.push(run.steamid);

      // Separate counter for TASes for a silly easter egg
      if (category === "tas") tas ++;
      runners ++;

    }

  }

  return { runners, categories, tas };

};

/**
 * Creates the animation that serves as the "Starting Stream" screen
 *
 * @param {object} config The week configuration (config.json)
 * @param {object} leaderboard The full leaderboard (leaderboard.json)
 */
window.standbyAnimation = async function (config, leaderboard) {

  const { runners, categories } = countRunners(leaderboard);

  // Display previously calculated statistics
  document.querySelector("#standby-info").innerHTML = `
    week ${config.number}<br>
    ${runners} runners<br>
    ${categories} categories
  `;

  // Get a screenshot of the map to use as a background image
  let screenshot = config.map.screenshot;
  if (!screenshot.startsWith("http")) screenshot = `https://steamuserimages-a.akamaihd.net/ugc/${screenshot}?impolicy=Letterbox&imh=1080`;
  document.querySelector("#standby-bg").src = screenshot;

  // Sleep for 5 seconds to give the host time to start the stream
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Start music playback
  const scWidget = await window.musicStartPlayer();

  // Start waiting for the intro track to end
  return await new Promise(async function (resolve) {

    /**
     * Fades out and gets rid of the standby screen
     */
    const finishStandby = function () {
      document.querySelector("#standby-container").style.opacity = 0;

      setTimeout(function () {
        document.querySelector("#standby-container").remove();
        resolve();
      }, 1000);
    };

    // Conclude the "Starting Stream" phase naturally 5 seconds before the intro track ends
    const musicDuration = await new Promise(r => scWidget.getDuration(d => r(d)));
    const musicPosition = await new Promise(r => scWidget.getPosition(p => r(p)));
    const musicStartedTime = Date.now() - musicPosition;
    const musicTimeout = setTimeout(finishStandby, musicDuration - musicPosition - 5000);

    // Set up audio visualizer using waveform data provided by SoundCloud
    const musicWaveformURL = await new Promise(r => scWidget.getCurrentSound(s => r(s.waveform_url)));
    const musicWaveform = await (await fetch(musicWaveformURL)).json();
    const waveformSamples = musicWaveform.samples;

    // Retrieve the canvas used for the visualizer animation
    const canvas = document.querySelector("#standby-canvas");
    const canvasBounds = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    // The canvas is scaled in CSS, so we use the rendered element's size here too
    const { width, height } = canvasBounds;
    canvas.width = width;
    canvas.height = height;

    const barCount = 25;
    const barSpacing = 10;
    const barWidth = width / barCount - barSpacing;

    // Fill the start of the samples array with zeroes to prevent out of bounds array access
    waveformSamples.unshift(...(new Array(barCount).fill(0)));
    // Calculate the duration for which each sample will be relevant
    const sampleDuration = musicDuration / waveformSamples.length;

    /**
     * Normalizes the waveform sample height and exponentiates it to accentuate smaller changes
     */
    const getBarHeight = function (sample) {
      const exponent = 2.5;
      return (sample / musicWaveform.height * 2) ** exponent / (2 ** exponent) * height;
    };

    function animate () {

      requestAnimationFrame(animate);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "white";

      // Recalculate music position from the starting time each frame
      const musicPosition = Date.now() - musicStartedTime;
      // Calculate the index of the currently relevant sample
      const sampleIndex = Math.floor(musicPosition / sampleDuration);
      // Calculate the progress towards the next sample as a number from 0 to 1
      const nextSampleProgress = 1 - (musicPosition % sampleDuration) / sampleDuration;

      for (let i = 0; i < barCount; i ++) {

        // Calculate where to put the bar horizontally - this makes the animation go left-to-right
        const xOffset = width - (barWidth + barSpacing) * (i + 1);

        // Interpolate height between the current and previous sample
        const sample = waveformSamples[sampleIndex + i];
        const prevSample = waveformSamples[sampleIndex + i - 1];
        const interpolatedSample = sample + (prevSample - sample) * nextSampleProgress;

        // The extra multiplication here makes the bars linearly diminish to the right
        const barHeight = getBarHeight(interpolatedSample) * ((i + 1) / barCount);

        // Finally, draw the thing
        ctx.fillRect(xOffset, height - barHeight, barWidth, barHeight);

      }

    }
    animate();

    /**
     * Allows for starting the UI early with a keypress
     * @param {unknown} event The keypress event
     */
    const emergencyStart = function (event) {
      if (event.keyCode !== 32) return; // "Space" key

      clearTimeout(musicTimeout);
      document.removeEventListener("keypress", emergencyStart);

      finishStandby();
    };
    document.addEventListener("keypress", emergencyStart);

  });

};

/**
 * Creates the animation that plays shortly before the leaderboard is displayed
 *
 * @param {object} config The week configuration (config.json)
 * @param {object} leaderboard The full leaderboard (leaderboard.json)
 */
window.introAnimation = async function (config, leaderboard) {

  // The intro animation mimics the Portal 2 console output from starting a map
  const { runners, tas } = countRunners(leaderboard);
  const lines = window.generateAnimationText(config, runners, tas).split("\n");

  // This element is responsible for showing the actual text
  const textElement = document.querySelector("#intro-anim-text");
  // This element creates a glow effect under the text
  const textBackgroundElement = document.querySelector("#intro-anim-text-bg");

  // Display the string line-by-line to mimic loading a map
  for (let i = 0; i < lines.length; i ++) {

    // Skip rendering empty lines - this lets us conveniently add pauses
    if (lines[i] === "" && lines[i-1] === "") continue;

    setTimeout(function () {
      textElement.innerHTML += "<span>" + lines[i] + "</span><br>";
      textBackgroundElement.innerHTML += "<span>" + lines[i] + "</span><br>";
    }, 10 * i);

  }

  // Wait until all text has been displayed to conclude the animation
  await new Promise(resolve => setTimeout(resolve, 10 * lines.length + 30));

  // Get the <span> surrounding each line for a shrink-wrapped container
  const span = textElement.getElementsByTagName("span");
  const spanBackground = textBackgroundElement.getElementsByTagName("span");

  // Flash each line fully white
  for (let i = 0; i < span.length; i ++) {
    span[i].style.borderRadius = "10px";

    span[i].style.backgroundColor = "#fff";
    spanBackground[i].style.backgroundColor = "#fff";
  }

  // Perform final animation cleanup and return
  return await new Promise(function (resolve) {

    // Get rid of the flash after 100ms
    setTimeout(function () {
      textElement.remove();
      textBackgroundElement.remove();
    }, 100);

    // Shrink the animation overlay vertically towards the center
    setTimeout(function () {
      document.querySelector("#intro-anim").style.transform = "scaleY(0)";
    }, 500);

    setTimeout(resolve, 1000);

  });

};
