const fs = require("node:fs");
const UtilPrint = require("../util/print.js");
const tmppath = require("../util/tmppath.js");
const archive = require("../util/archive.js");
const gamefiles = require("../util/gamefiles.js");
const spplice = require("../util/spplice.js");
const workshopper = require("../util/workshopper.js");
const flush = require("../util/flush.js");
const discord = require("../util/discord.js");

async function concludeWeek (context) {

  const week = context.data.week;

  week.voting = false;
  week.bonus = true;
  
  for (let i = 0; i < week.categories.length; i ++) {
    week.categories[i].lock = true;
  }

  await discord(["announce", "The leaderboard has been locked."], context);

  await Bun.write(context.file.week, JSON.stringify(week));

  return "SUCCESS";

}

async function releaseMap (context) {

  UtilPrint("epochtal(releaseMap): Creating archive...");
  await archive(["create", null, true], context);

  // Curate a week's worth of workshop maps, pick 5 for voting
  const VOTING_MAPS_COUNT = 5;

  UtilPrint("epochtal(releaseMap): Curating workshop maps...");
  const allmaps = await workshopper(["buildweek"], context);
  await Bun.write(`${__dirname}/../maps.json`, JSON.stringify(allmaps));

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

module.exports = {
  releaseMap,
  rebuildMap,
  concludeWeek
};
