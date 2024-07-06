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

async function concludeWeek (context) {

  const week = context.data.week;

  week.voting = false;
  week.bonus = true;
  
  for (let i = 0; i < week.categories.length; i ++) {
    week.categories[i].lock = true;
  }
  
  await points(["award"], context);

  await discord(["announce", "The leaderboard has been locked."], context);

  const { summary, timescales } = await summarizeDemoEvents(context);

  let textSummary = "## [ Demo event summary ]\n";
  for (let i = 0; i < summary.length; i ++) {
    textSummary += `\`${summary[i].cvar}\` in ${summary[i].count} demo${summary[i].count === 1 ? "" : "s"}: \`\`\`json\n${JSON.stringify(summary[i].demos)}\`\`\`\n`;
  }
  if (summary.length === 0) textSummary += "*All demos clean, nothing to report.*";

  let textTimescales = "## [ Demo timescale summary ]\n";
  for (let i = 0; i < timescales.length; i ++) {
    textTimescales += `\`${timescales[i].average.toFixed(5)}\` average in \`${timescales[i].demo}\`:\`\`\`json\n${JSON.stringify(timescales[i].array)}\`\`\`\n`;
  }
  if (timescales.length === 0) textTimescales += "*All demos clean, nothing to report.*";

  const finalReportText = `${textSummary}\n${textTimescales}`;
  UtilPrint("epochtal(concludeWeek):\n" + finalReportText);
  await discord(["report", finalReportText], context);

  await Bun.write(context.file.week, JSON.stringify(week));

  // Curate a week's worth of workshop maps
  UtilPrint("epochtal(concludeWeek): Curating workshop maps...");
  const allmaps = await workshopper(["buildweek"], context);
  await Bun.write(`${__dirname}/../maps.json`, JSON.stringify(allmaps));

  return "SUCCESS";

}

async function releaseMap (context) {

  UtilPrint("epochtal(releaseMap): Creating archive...");
  await archive(["create", null, true], context);

  // Load the curated workshop map set, pick 5 for voting
  const allmaps = await Bun.file(`${__dirname}/../maps.json`).json();
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
    data: { week: { map: votingmaps } },
    file: { portal2: context.file.portal2 }
  };

  let votingThumbnail = votingmaps[0].thumbnail;
  if (!votingThumbnail.startsWith("http")) votingThumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${votingThumbnail}?impolicy=Letterbox&imh=360`;
  
  const votingManifest = {
    title: `Tournament Week ${context.data.week.number + 1} Voting Pool`,
    name: `epochtal-voting${context.data.week.number + 1}`,
    author: "PortalRunner",
    icon: votingThumbnail,
    description: `Play future maps ahead of time and vote for your favorites on the Epochtal website.`,
    weight: 95
  };

  const votingFiles = await gamefiles(["build"], votingContext);
  const votingPackageNew = await spplice(["package", votingFiles.output, votingManifest], votingContext);

  fs.rmSync(votingFiles.output, { recursive: true });
  
  const votingPackagePath = `${__dirname}/../pages/epochtal-voting.sppkg`;
  const votingPackageBackup = await tmppath();

  fs.renameSync(votingPackagePath, votingPackageBackup);
  fs.renameSync(votingPackageNew, votingPackagePath);

  // Count votes and pick the next active map
  UtilPrint("epochtal(releaseMap): Counting map votes...");

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

  const newmap = await workshopper(["get", context.data.week.votingmaps[highestVoted].id]);
  newmap.upvotes = totalUpvotes[highestVoted];
  newmap.downvotes = totalDownvotes[highestVoted];

  // Build new game files and update Spplice repository
  UtilPrint(`epochtal(releaseMap): Building game files for map "${newmap.title}" by "${newmap.author}"...`);

  const archivePath = `${__dirname}/../pages/epochtal.tar.xz`;
  const manifestPath = `${__dirname}/../pages/spplice.json`;
  const archiveBackup = await tmppath();
  const manifestBackup = await tmppath();

  try {

    context.data.week.number ++;
    context.data.week.map = newmap;

    const portal2 = await gamefiles(["build"], context);
    const vmf = await gamefiles(["getvmf", `${portal2.output}/maps/${portal2.map[0]}`, true], context);
    const archive = await spplice(["archive", portal2.output], context);
    const manifest = await spplice(["manifest", null], context);
  
    fs.rmSync(portal2.output, { recursive: true });

    fs.renameSync(archivePath, archiveBackup);
    fs.renameSync(archive, archivePath);
    fs.renameSync(manifestPath, manifestBackup);
    fs.renameSync(manifest, manifestPath);

    fs.renameSync(vmf, `${__dirname}/../vmfs/${context.data.week.map.id}.vmf.xz`);

    context.data.week.map.file = portal2.map[0];
    
    const announceText = `With a community vote of ${context.data.week.map.upvotes} upvotes to ${context.data.week.map.downvotes} downvotes, the map for week ${context.data.week.number} of PortalRunner's Weekly Tournament was decided to be ${context.data.week.map.title} by ${context.data.week.map.author}.`;
    await discord(["announce", announceText], context);
  
  } catch (e) {

    await flush(["memory"], context);

    fs.renameSync(votingPackageBackup, votingPackagePath);

    if (fs.existsSync(archiveBackup)) fs.renameSync(archiveBackup, archivePath);
    if (fs.existsSync(manifestBackup)) fs.renameSync(manifestBackup, manifestPath);

    e.message = "ERR_GAMEFILES: " + e.message;
    throw e;

  }

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

    fs.renameSync(votingPackageBackup, votingPackagePath);

    if (fs.existsSync(archiveBackup)) fs.renameSync(archiveBackup, archivePath);
    if (fs.existsSync(manifestBackup)) fs.renameSync(manifestBackup, manifestPath);

    e.message = "ERR_WRITEMEM: " + e.message;
    throw e;

  }

  await Bun.write(context.file.week, weekString);
  await Bun.write(context.file.leaderboard, leaderboardString);
  await Bun.write(context.file.log, "");

  return "SUCCESS";

}

async function rebuildMap (context) {

  const archivePath = `${__dirname}/../pages/epochtal.tar.xz`;
  const archiveBackup = await tmppath();

  try {

    const portal2 = await gamefiles(["build"], context);
    const archive = await spplice(["archive", portal2.output], context);
  
    fs.rmSync(portal2.output, { recursive: true });
  
    fs.renameSync(archivePath, archiveBackup);
    fs.renameSync(archive, archivePath);

  } catch (e) {

    if (fs.existsSync(archiveBackup)) fs.renameSync(archiveBackup, archivePath);

    e.message = "ERR_GAMEFILES: " + e.message;
    throw e;

  }

  return "SUCCESS";

}

const [VERDICT_SAFE, VERDICT_UNSURE, VERDICT_ILLEGAL] = [0, 1, 2];
async function summarizeDemoEvents (context) {

  const summary = {}, timescales = {};
  const files = fs.readdirSync(context.file.demos);

  for (let i = 0; i < files.length; i ++) {

    if (!files[i].endsWith(".dem.xz")) continue;

    const category = files[i].split("_")[1].split(".")[0];
    const categoryData = await categories(["get", category]);

    if (!categoryData.points && category !== "ppnf") continue;

    const xzFile = `${context.file.demos}/${files[i]}`;
    await $`xz -dkf ${xzFile}`.quiet();

    const file = `${context.file.demos}/${files[i].slice(0, -3)}`;
    const mdp = await demo(["mdp", file]);

    fs.unlinkSync(file);

    const fileNoExtension = files[i].slice(0, -7);

    for (const event of mdp.demos[0].events) {
      
      if (event.type === "timescale") {

        if (!(fileNoExtension in timescales)) {
          timescales[fileNoExtension] = { average: 0, array: [] };
        }

        const scale = Number(event.value);
        timescales[fileNoExtension].array.push(scale);
        timescales[fileNoExtension].average += scale;

        continue;

      }

      if (event.type !== "cvar" && event.type !== "cmd") continue;

      const cvar = event.type === "cvar" ? event.val.cvar : event.value.split(" ")[0];
      const value = event.type === "cvar" ? event.val.val : event.value.split(" ").slice(1).join(" ");

      const verdict = await testcvar([cvar, value], context);
      
      if (verdict !== VERDICT_SAFE) {

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

    if (fileNoExtension in timescales) {
      const unscaledTicks = mdp.demos[0].ticks - timescales[fileNoExtension].array.length;
      timescales[fileNoExtension].average += unscaledTicks;
      timescales[fileNoExtension].average /= mdp.demos[0].ticks;
    }

  }

  const sortedSummary = [];
  for (const cvar in summary) {
    summary[cvar].cvar = cvar;
    sortedSummary.push(summary[cvar]);
  }

  sortedSummary.sort(function (a, b) {
    return a.count - b.count;
  });

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
  }

}

async function rebuildProfiles (context) {

  const userList = await users(["list"], context);
  
  for (const steamid in userList) {
    await profiledata(["forceadd", steamid], context);
    await users(["apiupdate", steamid], context);
    await profilelog(["build", steamid], context);
  }

  await points(["rebuild"], context);

  return "SUCCESS";

}

module.exports = {
  releaseMap,
  rebuildMap,
  concludeWeek,
  summarizeDemoEvents,
  rebuildProfiles
};
