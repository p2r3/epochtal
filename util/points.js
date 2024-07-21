const UtilError = require("./error.js");
const UtilPrint = require("./print.js");

const fs = require("node:fs");

const leaderboard = require("./leaderboard.js");
const categories = require("./categories.js");
const archive = require("./archive.js");
const profilelog = require("./profilelog.js");
const profiledata = require("./profiledata.js");

const [ WIN, LOSS, DRAW ] = [1, -1, 0];
function calculateEloDelta (playerElo, opponentElo, result, kFactor = 32) {

  function expectedScore (ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  const playerExpected = expectedScore(playerElo, opponentElo);
  const opponentExpected = expectedScore(opponentElo, playerElo);

  let playerScore, opponentScore;
  switch (result) {
  
    case WIN:
      playerScore = 1;
      opponentScore = 0;
      break;

    case LOSS:
      playerScore = 0;
      opponentScore = 1;
      break;

    default:
    case DRAW:
      playerScore = 0.5;
      opponentScore = 0.5;
      break;
  
  }

  return {
    player: kFactor * (playerScore - playerExpected),
    opponent: kFactor * (opponentScore - opponentExpected)
  };

}

function calculateTotalPoints (statistics) {

  let totalPoints = 1000;

  for (let i = 0; i < statistics.length; i ++) {
    for (let j = 0; j < statistics[i].length; j ++) {
      totalPoints += statistics[i][j];
    }
  }

  return totalPoints;

}

function calculateDisplayPoints (statistics) {

  let runs = 0;
  let totalPoints = 1000;

  for (let i = 0; i < statistics.length; i ++) {
    for (let j = 0; j < statistics[i].length; j ++) {
      runs ++;
      totalPoints += statistics[i][j];
    }
  }

  if (runs < 10) return null;
  if (totalPoints < 0) return Number((-100 / totalPoints).toFixed(2));
  return Number((totalPoints + 100).toFixed(2));

}

async function pointsFromSteamID (steamid, context = epochtal) {

  const profile = await profiledata(["get", steamid], context);
  return calculateTotalPoints(profile.statistics);

}

async function calculatePointsDelta (context = epochtal) {

  const users = context.data.users;
  const boards = await leaderboard(["list"], context);
  const catlist = await categories(["list"], context);
  const partners = context.data.week.partners;
  const catDeltaElo = {};
  
  for (let i = 0; i < boards.length; i ++) {

    const catname = boards[i];
    if (!catlist.includes(catname)) continue;

    const cat = await categories(["get", catname], context);
    if (!cat.points) continue;
    const lb = await leaderboard(["get", catname], context);

    catDeltaElo[catname] = {};
    const deltaElo = catDeltaElo[catname];
    
    for (let j = 0; j < lb.length; j ++) {
      const playerTime = lb[j].time;
      const player = lb[j].steamid;
      if (!(player in deltaElo)) deltaElo[player] = 0;

      for (let k = j + 1; k < lb.length; k ++) {
        const opponentTime = lb[k].time;
        const opponent = lb[k].steamid;
        if (!(opponent in deltaElo)) deltaElo[opponent] = 0;

        const result = playerTime === opponentTime ? DRAW : WIN;

        if ((lb[j].partner && lb[k].partner) || (cat.coop && partners && partners[player] && partners[opponent])) {

          const playerPartner = lb[j].partner || partners[player];
          const opponentPartner = lb[k].partner || partners[opponent];
          
          if (!(playerPartner in deltaElo)) deltaElo[playerPartner] = 0;
          if (!(opponentPartner in deltaElo)) deltaElo[opponentPartner] = 0;

          const playerAverage = (await pointsFromSteamID(player, context) + await pointsFromSteamID(playerPartner, context)) / 2;
          const opponentAverage = (await pointsFromSteamID(opponent, context) + await pointsFromSteamID(opponentPartner, context)) / 2;

          const elo = calculateEloDelta(playerAverage, opponentAverage, result);

          deltaElo[player] += elo.player;
          deltaElo[playerPartner] += elo.player;
          deltaElo[opponent] += elo.opponent;
          deltaElo[opponentPartner] += elo.opponent;

        } else {

          const elo = calculateEloDelta(await pointsFromSteamID(player), await pointsFromSteamID(opponent), result);

          deltaElo[player] += elo.player;
          deltaElo[opponent] += elo.opponent;

        }

      }
    }

  }

  const output = {};

  for (const cat in catDeltaElo) {
    for (const steamid in catDeltaElo[cat]) {
      if (!(steamid in output)) output[steamid] = [];
      output[steamid].push(catDeltaElo[cat][steamid]);
    }
  }

  return output;

}

module.exports = async function (args, context = epochtal) {

  const [command] = args;

  const file = context.file.users;
  const users = context.data.users;

  switch (command) {

    case "user": {

      const steamid = args[1];
      if (!steamid) throw new UtilError("ERR_ARGS", args, context);

      const profile = await profiledata(["get", steamid], context);

      return {
        total: calculateTotalPoints(profile.statistics),
        display: calculateDisplayPoints(profile.statistics)
      };

    }

    case "calculate": {

      return await calculatePointsDelta(context);

    }

    case "award": {

      const deltaElo = await calculatePointsDelta(context);

      for (const steamid in deltaElo) {

        const profile = await profiledata(["get", steamid], context);
        profile.statistics.push(deltaElo[steamid]);
        profile.weeks.push(context.data.week.number);

        users[steamid].points = calculateDisplayPoints(profile.statistics);

        profiledata(["flush", steamid], context);

      }

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

    case "rebuild": {

      const usersList = [];
      const archiveList = (await archive(["list"], context)).reverse();
      for (const week of archiveList) {

        const archiveContext = await archive(["get", week], context);
        const deltaElo = await calculatePointsDelta(archiveContext);

        for (const steamid in deltaElo) {

          const profile = await profiledata(["get", steamid], context);
          
          if (!usersList.includes(steamid)) {
            usersList.push(steamid);
            profile.statistics = [];
            profile.weeks = [];
          }

          profile.statistics.push(deltaElo[steamid]);
          profile.weeks.push(archiveContext.data.week.number);

        }

      }

      for (const steamid of usersList) {
        const profile = await profiledata(["get", steamid], context);
        users[steamid].points = calculateDisplayPoints(profile.statistics);
        profiledata(["flush", steamid], context);
      }

      if (file) Bun.write(file, JSON.stringify(users));
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
