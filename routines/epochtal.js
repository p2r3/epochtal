const { $ } = require("bun");
const fs = require("node:fs");
const UtilPrint = require("../util/print.js");
const tmppath = require("../util/tmppath.js");
const archive = require("../util/archive.js");
const gamefiles = require("../util/gamefiles.js");
const spplice = require("../util/spplice.js");
const workshopper = require("../util/workshopper.js");
const flush = require("../util/flush.js");
const discord = require("../util/discord.js");
const demo = require("../util/demo.js");
const testcvar = require("../util/testcvar.js");
const categories = require("../util/categories.js");
const users = require("../util/users.js");
const profiledata = require("../util/profiledata.js");
const profilelog = require("../util/profilelog.js");
const points = require("../util/points.js");
const curator = require("../util/curator.js");

// Scheduled routines are designed to revert all changes upon failing or to fail invisibly
// This causes messy try/catches, but is better than leaving the system in a half-broken state

/**
 * Routine to conclude a week of the Epochtal tournament
 *
 * @param {unknown} context The context on which to execute the call
 * @returns {string} The result of the routine
 */
async function concludeWeek (context) {

  const week = context.data.week;

  // Switch from voting phase to bonus phase
  week.voting = false;
  for (let i = 0; i < week.categories.length; i ++) {
    week.categories[i].lock = true;
  }

  // Award points to participants
  await points(["award"], context);

  // Announce the routine on Discord
  await discord(["announce", "The leaderboard and map voting have been locked. Points have been updated."], context);

  // Create a summary of all suspicious demo events
  const { summary, timescales } = await summarizeDemoEvents(context);

  let textSummary = "## Demo event summary\n";
  for (let i = 0; i < summary.length; i ++) {
    textSummary += `\`${summary[i].cvar}\` in ${summary[i].count} demo${summary[i].count === 1 ? "" : "s"}:\n- \`${summary[i].demos.join("`\n- `")}\`\n\n`;
  }
  if (summary.length === 0) textSummary += "*All demos clean, nothing to report.*";

  let textTimescales = "## Demo timescale summary\n";
  for (let i = 0; i < timescales.length; i ++) {
    textTimescales += `\`${timescales[i].average.toFixed(5)}\` average in \`${timescales[i].demo}\`:\n- \`${timescales[i].array.join(", ")}\`\n\n`;
  }
  if (timescales.length === 0) textTimescales += "*All demos clean, nothing to report.*";

  // Print report to console and save it to file
  const finalReportText = `${textSummary}\n${textTimescales}`;
  UtilPrint("epochtal(concludeWeek):\n" + finalReportText);

  const finalReportPath = (await tmppath()) + ".md";
  await Bun.write(finalReportPath, finalReportText);

  // Report the summary including the demo files on Discord
  const demoTarPath = (await tmppath()) + ".tar";
  await $`tar -cf ${demoTarPath} -C ${context.file.demos} .`.quiet();

  try {
    await discord(["report", `Week ${week.number} demo report summary:`, [finalReportPath, demoTarPath]], context);
  } finally {
    fs.unlinkSync(finalReportPath);
    fs.unlinkSync(demoTarPath);
  }

  // Write the week data to the file
  await Bun.write(context.file.week, JSON.stringify(week));

  // Parse suggested maps (remove those which have been picked)
  const suggestions = await Bun.file(`${gconfig.datadir}/suggestions.json`).json();
  for (let i = 0; i < suggestions.length; i ++) {
    if (!("v1" in suggestions[i] && "v2" in suggestions[i])) {
      suggestions.splice(i, 1);
      i --;
    }
  }

  // Curate a week's worth of workshop maps
  UtilPrint("epochtal(concludeWeek): Ensuring that v2 density graphs are up to date...");
  await curator(["graph"], context);

  UtilPrint("epochtal(concludeWeek): Curating workshop maps...");
  const allmaps = await workshopper(["curateweek", suggestions], context);
  await Bun.write(`${gconfig.datadir}/maps.json`, JSON.stringify(allmaps));

  return "SUCCESS";

}

/**
 * Routine to release the new map for the Epochtal tournament
 *
 * @param {unknown} context The context on which to execute the call
 * @returns {string} The result of the routine
 */
async function releaseMap (context) {

  // Archive the current week
  UtilPrint("epochtal(releaseMap): Creating archive...");
  await archive(["create", null, true], context);

  // Update profile logs for all users
  UtilPrint("epochtal(releaseMap): Rebuilding profile logs...");
  for (const steamid in context.data.users) {
    await profilelog(["build", steamid], context);
  }

  // Load the curated workshop map set, pick 5 for voting
  const allmaps = await Bun.file(`${gconfig.datadir}/maps.json`).json();
  const VOTING_MAPS_COUNT = 5;

  UtilPrint("epochtal(releaseMap): Building voting map list...");
  const votingmaps = [];
  for (let i = 0; i < allmaps.length; i ++) {

    const details = await workshopper(["get", allmaps[i].id]);
    if (votingmaps.find(curr => curr.author === details.author)) continue;

    votingmaps.push(details);
    if (votingmaps.length === VOTING_MAPS_COUNT) break;

  }

  // Create Spplice package for voting list maps
  UtilPrint("epochtal(releaseMap): Creating voting map Spplice package...");

  const votingContext = {
    data: { week: { number: ((context.data.week.number + 1) + "-voting"), map: votingmaps } },
    file: { portal2: context.file.portal2 }
  };

  let votingThumbnail = votingmaps[0].thumbnail;
  if (!votingThumbnail.startsWith("http")) {
    votingThumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${votingThumbnail}?impolicy=Letterbox&imh=360`;
  }

  let sppliceVotingResult;
  try {

    if (await spplice(["get", "epochtal-voting"])) {
      await spplice(["remove", "epochtal-voting"]);
    }

    const votingFiles = await gamefiles(["build"], votingContext);

    // It doesn't make much sense for the voting package to start on the main menu
    const valveRC = Bun.file(`${votingFiles.output}/cfg/valve.rc`);
    const valveRCText = await valveRC.text();
    await Bun.write(valveRC, valveRCText.replace("startupmenu", "exec epochtal_map"));

    try {
      sppliceVotingResult = await spplice(["add",
        "epochtal-voting",
        votingFiles.output,
        `Tournament Week ${context.data.week.number + 1} Voting Pool`,
        "PortalRunner",
        votingThumbnail,
        "Play future maps ahead of time and vote for your favorites on the Epochtal website.",
        2995
      ]);
    } finally {
      fs.rmSync(votingFiles.output, { recursive: true });
    }

  } catch (e) {

    if (sppliceVotingResult) await spplice(["remove", "epochtal-voting"]);

    e.message = "ERR_VOTEFILES: " + e.message;
    throw e;

  }

  // Count votes and pick the next active map
  UtilPrint("epochtal(releaseMap): Counting map votes...");

  let newmap;
  try {

    const totalVotes = Array(VOTING_MAPS_COUNT).fill(0);
    const totalUpvotes = Array(VOTING_MAPS_COUNT).fill(0);
    const totalDownvotes = Array(VOTING_MAPS_COUNT).fill(0);

    for (const steamid in context.data.week.votes) {

      const curr = context.data.week.votes[steamid];

      for (let i = 0; i < VOTING_MAPS_COUNT; i ++) {
        if (curr[i] > 0) totalUpvotes[i] += curr[i];
        else if (curr[i] < 0) totalDownvotes[i] -= curr[i];
        totalVotes[i] += curr[i];
      }

    }

    let highestVoted = 0;
    for (let i = 1; i < VOTING_MAPS_COUNT; i ++) {
      if (totalVotes[i] > totalVotes[highestVoted]) {
        highestVoted = i;
      }
    }

    newmap = await workshopper(["get", context.data.week.votingmaps[highestVoted].id]);
    newmap.upvotes = totalUpvotes[highestVoted];
    newmap.downvotes = totalDownvotes[highestVoted];

  } catch (e) {

    await spplice(["remove", "epochtal-voting"]);

    e.message = "ERR_VOTEFILES: " + e.message;
    throw e;

  }

  // Build new game files and update Spplice repository
  UtilPrint(`epochtal(releaseMap): Building game files for map "${newmap.title}" by "${newmap.author}"...`);

  let sppliceResult = null;
  let announceText;

  try {

    context.data.week.number ++;
    context.data.week.map = newmap;

    announceText = `With a community vote of ${context.data.week.map.upvotes} upvotes to ${context.data.week.map.downvotes} downvotes, the map for week ${context.data.week.number} of the weekly tournament was decided to be ${context.data.week.map.title} by ${context.data.week.map.author}.`;

    let thumbnail = context.data.week.map.thumbnail;
    if (!thumbnail.startsWith("http")) {
      thumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${thumbnail}?impolicy=Letterbox&imh=360`;
    }

    // If the routine fails somewhere here, we can't easily revert a Spplice package change
    // However, since the board would be locked by now, we can afford deleting the old package
    // The focus should be on not "leaking" the new package early
    if (await spplice(["get", "epochtal"])) {
      await spplice(["remove", "epochtal"]);
    }

    const portal2 = await gamefiles(["build"], context);
    const vmf = await gamefiles(["getvmf", `${portal2.output}/maps/${portal2.map[0]}`, true], context);

    try {
      sppliceResult = await spplice(["add",
        "epochtal",
        portal2.output,
        "Tournament Week " + context.data.week.number,
        "PortalRunner",
        thumbnail,
        announceText,
        3000
      ]);
    } finally {
      fs.rmSync(portal2.output, { recursive: true });
    }

    fs.renameSync(vmf, `${context.file.vmfs}/${context.data.week.map.id}.vmf.xz`);

  } catch (e) {

    await flush(["memory"], context);

    await spplice(["remove", "epochtal-voting"]);
    if (sppliceResult) await spplice(["remove", "epochtal"]);

    e.message = "ERR_GAMEFILES: " + e.message;
    throw e;

  }

  // Prepare the new week configuration
  UtilPrint(`epochtal(releaseMap): Writing configuration for week ${context.data.week.number}...`);

  let weekString, leaderboardString;
  try {

    context.data.week.voting = true;
    context.data.week.bonus = false;
    context.data.week.date = Math.floor(Date.now() / 1000);
    context.data.week.votingmaps = votingmaps;
    context.data.week.votes = {};
    context.data.week.partners = {};

    for (let i = 0; i < context.data.week.categories.length; i ++) {
      context.data.week.categories[i].lock = false;
    }

    context.data.leaderboard = {};

    weekString = JSON.stringify(context.data.week);
    leaderboardString = JSON.stringify(context.data.leaderboard);

  } catch (e) {

    await flush(["memory"], context);

    await spplice(["remove", "epochtal-voting"]);
    await spplice(["remove", "epochtal"]);

    e.message = "ERR_WRITEMEM: " + e.message;
    throw e;

  }

  // Update the suggestions file
  try {

    const suggestionsFile = Bun.file(`${gconfig.datadir}/suggestions.json`);
    const suggestions = await suggestionsFile.json();

    // Remove the suggestions that were voted on
    for (const map of votingmaps) {
      const suggestion = suggestions.find(c => c.id === map.id);
      if (!suggestion) continue;

      delete suggestion.v1;
      delete suggestion.v2;
    }
    await Bun.write(suggestionsFile, JSON.stringify(suggestions));

  } catch (e) {

    await flush(["memory"], context);

    await spplice(["remove", "epochtal-voting"]);
    await spplice(["remove", "epochtal"]);

    e.message = "ERR_UPDATE_SUGGESTIONS: " + e.message;
    throw e;

  }

  // Write the new week configuration to the file
  await Bun.write(context.file.week, weekString);
  await Bun.write(context.file.leaderboard, leaderboardString);
  await Bun.write(context.file.log, "");

  // Announce the new week on Discord
  await discord(["announce", "@everyone " + announceText], context);

  return "SUCCESS";

}

/**
 * Routine to rebuild the spplice package for the current week
 *
 * @param {unknown} context The context on which to execute the call
 * @returns {string} The result of the routine
 */
async function rebuildMap (context) {

  let thumbnail = context.data.week.map.thumbnail;
  if (!thumbnail.startsWith("http")) {
    thumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${thumbnail}?impolicy=Letterbox&imh=360`;
  }
  const announceText = `With a community vote of ${context.data.week.map.upvotes} upvotes to ${context.data.week.map.downvotes} downvotes, the map for week ${context.data.week.number} of the weekly tournament was decided to be ${context.data.week.map.title} by ${context.data.week.map.author}.`;

  if (await spplice(["get", "epochtal"])) {
    await spplice(["remove", "epochtal"]);
  }

  const portal2 = await gamefiles(["build"], context);

  try {
    await spplice(["add",
      "epochtal",
      portal2.output,
      "Tournament Week " + context.data.week.number,
      "PortalRunner",
      thumbnail,
      announceText,
      3000
    ]);
  } finally {
    fs.rmSync(portal2.output, { recursive: true });
  }

  return "SUCCESS";

}

/**
 * Routine to rebuild the spplice package for the voting maps
 *
 * @param {unknown} context The context on which to execute the call
 * @returns {string} The result of the routine
 */
async function rebuildVotingMaps (context) {

  const { votingmaps, number } = context.data.week;

  const votingContext = {
    data: { week: { number: number + "-voting", map: votingmaps } },
    file: { portal2: context.file.portal2 }
  };

  let votingThumbnail = votingmaps[0].thumbnail;
  if (!votingThumbnail.startsWith("http")) {
    votingThumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${votingThumbnail}?impolicy=Letterbox&imh=360`;
  }

  if (await spplice(["get", "epochtal-voting"])) {
    await spplice(["remove", "epochtal-voting"]);
  }

  const votingFiles = await gamefiles(["build"], votingContext);

  // It doesn't make much sense for the voting package to start on the main menu
  const valveRC = Bun.file(`${votingFiles.output}/cfg/valve.rc`);
  const valveRCText = await valveRC.text();
  await Bun.write(valveRC, valveRCText.replace("startupmenu", "exec epochtal_map"));

  try {
    await spplice(["add",
      "epochtal-voting",
      votingFiles.output,
      `Tournament Week ${number} Voting Pool`,
      "PortalRunner",
      votingThumbnail,
      "Play future maps ahead of time and vote for your favorites on the Epochtal website.",
      2995
    ]);
  } finally {
    fs.rmSync(votingFiles.output, { recursive: true });
  }

  return "SUCCESS";

}

const [VERDICT_SAFE, VERDICT_UNSURE, VERDICT_ILLEGAL] = [0, 1, 2];

/**
 * Routine to summarize all demo events.
 *
 * @param {unknown} context The context on which to execute the call
 * @returns {object} The summary of demo events
 */
async function summarizeDemoEvents (context) {

  // Iterate through each demo file
  const summary = {}, timescales = {};
  const files = fs.readdirSync(context.file.demos);

  for (let i = 0; i < files.length; i ++) {

    // Ignore non-demo files
    if (!files[i].endsWith(".dem.xz")) continue;

    const category = files[i].split("_")[1].split(".")[0];
    const categoryData = await categories(["get", category]);

    // Ignore non-scored categories, excluding the PPNF category
    if (!categoryData.points && category !== "ppnf") continue;

    // Analyze the demo file
    const xzFile = `${context.file.demos}/${files[i]}`;
    await $`xz -dkf ${xzFile}`.quiet();

    const file = `${context.file.demos}/${files[i].slice(0, -3)}`;
    const mdp = await demo(["mdp", file]);

    fs.unlinkSync(file);

    const fileNoExtension = files[i].slice(0, -7);

    // Iterate through each event in the demo
    for (const event of mdp.demos[0].events) {

      // Report timescale events
      if (event.type === "timescale") {

        if (!(fileNoExtension in timescales)) {
          timescales[fileNoExtension] = { average: 0, array: [] };
        }

        const scale = Number(event.value);
        timescales[fileNoExtension].array.push(scale);
        timescales[fileNoExtension].average += scale;

        continue;

      }

      // Ignore non-command events
      if (event.type !== "cvar" && event.type !== "cmd") continue;

      // Test if cvar is safe
      const cvar = event.type === "cvar" ? event.val.cvar : event.value.split(" ")[0];
      const value = event.type === "cvar" ? event.val.val : event.value.split(" ").slice(1).join(" ");

      const verdict = await testcvar([cvar, value], context);

      // If cvar is not safe, add it to the summary
      if (verdict !== VERDICT_SAFE) {

        // Skip the PPNF category for the sv_portal_placement_never_fail cvar
        if (cvar === "sv_portal_placement_never_fail" && files[i].endsWith("_ppnf.dem.xz")) {
          continue;
        }

        if (!(cvar in summary)) summary[cvar] = {
          count: 0,
          demos: []
        };

        summary[cvar].count ++;
        if (!summary[cvar].demos.includes(fileNoExtension)) {
          summary[cvar].demos.push(fileNoExtension);
        }

      }

    }

    // Calculate the average timescale for the demo
    if (fileNoExtension in timescales) {
      const unscaledTicks = mdp.demos[0].ticks - timescales[fileNoExtension].array.length;
      timescales[fileNoExtension].average += unscaledTicks;
      timescales[fileNoExtension].average /= mdp.demos[0].ticks;
    }

  }

  // Sort the summary
  const sortedSummary = [];
  for (const cvar in summary) {
    summary[cvar].cvar = cvar;
    sortedSummary.push(summary[cvar]);
  }

  sortedSummary.sort(function (a, b) {
    return a.count - b.count;
  });

  // Sort the timescales
  const sortedTimescales = [];
  for (const demo in timescales) {
    timescales[demo].demo = demo;
    sortedTimescales.push(timescales[demo]);
  }

  sortedTimescales.sort(function (a, b) {
    return Math.abs(1.0 - b.average) - Math.abs(1.0 - a.average);
  });

  return {
    summary: sortedSummary,
    timescales: sortedTimescales
  };

}

/**
 * Routine to rebuild all user profiles
 *
 * @param {unknown} context The context on which to execute the call
 * @returns {string} The result of the routine
 */
async function rebuildProfiles (context) {

  const userList = await users(["list"], context);

  // Rebuild all user profiles
  for (const steamid in userList) {
    await profiledata(["forceadd", steamid], context);
    await users(["apiupdate", steamid], context);
    await profilelog(["build", steamid], context);
  }

  await points(["rebuild"], context);

  return "SUCCESS";

}

// Export the routines
module.exports = {
  releaseMap,
  rebuildMap,
  rebuildVotingMaps,
  concludeWeek,
  summarizeDemoEvents,
  rebuildProfiles
};
