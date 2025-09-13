const UtilError = require("./error.js");
const weeklog = require("./weeklog.js");
const categories = require("./categories.js");
const archive = require("./archive.js");
const profiledata = require("./profiledata.js");

const [ WIN, LOSS, DRAW ] = [1, -1, 0];

/**
 * Calculate the elo delta for a player against an opponent.
 *
 * @param {Number} playerElo The player's elo
 * @param {Number} opponentElo The opponent's elo
 * @param {Enum} result The result of the match
 * @param {Number} kFactor The k-factor for the elo calculation (max elo change)
 * @returns
 */
function calculateEloDelta (playerElo, opponentElo, result, kFactor = 32) {

  /**
   * Function to calculate the expected score of a player against an opponent.
   * This is the probability of the player winning against the opponent according to their elo.
   *
   * @param {Number} ratingA The player's elo
   * @param {Number} ratingB The opponent's elo
   * @returns {Number} The expected score
   */
  function expectedScore (ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  // Calculate the expected scores for the player and opponent
  const playerExpected = expectedScore(playerElo, opponentElo);
  const opponentExpected = expectedScore(opponentElo, playerElo);

  // Get multipliers for the elo change based on the result
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

  // Calculate the elo change for the player and opponent
  return {
    player: kFactor * (playerScore - playerExpected),
    opponent: kFactor * (opponentScore - opponentExpected)
  };

}

/**
 * Simple function to calculate the total points for a user,
 * by adding all of their individual delta points together.
 * Unlike display points, this does not include the lower bound,
 * but still includes the 1000 base points.
 *
 * @param {Number[]} statistics The user's statistics for the respective category
 * @returns {Number} The total points for the respective category
 */
function calculateTotalPoints (statistics) {

  let totalPoints = 1000;

  // Calculate the total points
  for (let i = 0; i < statistics.length; i ++) {
    totalPoints += statistics[i];
  }

  return totalPoints;

}

/**
 * Calculate the display points for a user based on their statistics in a category.
 * Display points are all of the players elo points added together with additionally
 * offset and lower bound to increase the appeal of the visual representation.
 *
 * @param {Number[]} statistics Elo points for each participation in the respective category
 * @returns {Number} The display points for the respective category
 */
function calculateDisplayPoints (statistics) {

  let runs = 0;
  let totalPoints = 1000; // To avoid negative points

  // Calculate the total points and runs
  for (let i = 0; i < statistics.length; i ++) {
    runs ++;
    totalPoints += statistics[i];
  }

  // If the user has less than 10 runs, return null
  if (runs < 10) return null;

  // If the user has negative points, calculate points towards 0.
  if (totalPoints < 0) return Number((-100 / totalPoints).toFixed(2));

  // Otherwise, return totalPoints + 100
  return Number((totalPoints + 100).toFixed(2));

}

/**
 * Grab a user's total elo to this point as stored in their profile data.
 *
 * @param {string} steamid The user's steamid
 * @param {string} category The name of the category for which to calculate Elo
 * @param {object} context The context object, defaults to epochtal
 * @returns {number} The user's total elo
 */
async function pointsFromSteamID (steamid, category, context = epochtal) {

  const profile = await profiledata(["get", steamid], context);
  if (!(category in profile.statistics)) profile.statistics[category] = [];
  return calculateTotalPoints(profile.statistics[category]);

}

/**
 * Calculate the elo acquired or lost for each player in this week.
 * Note: Despite only returning the elo delta, the calculation itself is
 * based on the elo already found in the profile data (see pointsFromSteamID).
 *
 * @param {unknown} context The context object, defaults to epochtal
 * @returns {object} The elo delta for each player
 */
async function calculatePointsDelta (context = epochtal) {

  // Get all final leaderboards
  const allBoards = context.data.leaderboard;
  // Get a reconstruction of the week log as a leaderboard
  const reconstructed = await weeklog(["reconstruct"], context);

  const catlist = await categories(["list"], context);
  const partners = context.data.week.partners;
  const catDeltaElo = {};

  // For all categories with at least one submission
  for (const catname in allBoards) {

    // Ensure the category is in the list of active categories at the conclusion of the week
    if (!catlist.includes(catname)) continue;

    // Ensure the category is scored
    const cat = await categories(["get", catname], context);
    if (!cat.points) continue;

    // Perform a deep copy of the relevant leaderboard
    const lb = structuredClone(allBoards[catname]);

    // Add any player-removed runs back to the cloned leaderboard
    for (const run of reconstructed[catname]) {
      const steamid = run.steamid;

      // Check if this runner (or pair) is missing from the final leaderboard
      const exists = allBoards[catname].some(curr => {
        if (curr.steamid === steamid || curr.partner === steamid) return true;
        if (cat.coop && partners && partners[curr.steamid] === steamid) return true;
        return false;
      });
      if (exists) continue;

      let insert = null;

      for (let i = 0; i < lb.length; i ++) {
        if (cat.portals) {
          // This will treat all deleted LP runs as segmented. It's not an ideal solution, but
          // there's no such flag in log entries. Arguably, a punishment for removing the run.
          if (lb[i].portals > run.portals || (lb[i].segmented && lb[i].portals === run.portals && lb[i].time > run.time)) {
            insert = i;
            break;
          }
        } else if (lb[i].time > run.time) {
          insert = i;
          break;
        }
      }

      // Insert the run in the sorted position, *unless it's a world record*
      // If you're deleting a WR, chances are it's an accidental submission
      if (insert === null) lb.push(run);
      else if (insert !== 0) lb.splice(insert, 0, run);

    }

    catDeltaElo[catname] = {};
    const deltaElo = catDeltaElo[catname];

    // Calculate the elo delta for each run starting at the fastest
    for (let j = 0; j < lb.length; j ++) {
      const playerTime = lb[j].time;
      const player = lb[j].steamid;
      if (!(player in deltaElo)) deltaElo[player] = 0;

      // Calculate the elo against every run placed lower than the current run
      for (let k = j + 1; k < lb.length; k ++) {
        const opponentTime = lb[k].time;
        const opponent = lb[k].steamid;
        if (!(opponent in deltaElo)) deltaElo[opponent] = 0;

        const result = playerTime === opponentTime ? DRAW : WIN;

        // Check if the run is a coop run
        if ((lb[j].partner && lb[k].partner) || (cat.coop && partners && partners[player] && partners[opponent])) {

          const playerPartner = lb[j].partner || partners[player];
          const opponentPartner = lb[k].partner || partners[opponent];

          if (!(playerPartner in deltaElo)) deltaElo[playerPartner] = 0;
          if (!(opponentPartner in deltaElo)) deltaElo[opponentPartner] = 0;

          // Calculate elo averages between the two players and their partners
          const playerAverage = (await pointsFromSteamID(player, catname, context) + await pointsFromSteamID(playerPartner, catname, context)) / 2;
          const opponentAverage = (await pointsFromSteamID(opponent, catname, context) + await pointsFromSteamID(opponentPartner, catname, context)) / 2;

          // Run the elo calculation
          const elo = calculateEloDelta(playerAverage, opponentAverage, result);

          deltaElo[player] += elo.player;
          deltaElo[playerPartner] += elo.player;
          deltaElo[opponent] += elo.opponent;
          deltaElo[opponentPartner] += elo.opponent;

        } else {

          // Run the elo calculation
          const elo = calculateEloDelta(await pointsFromSteamID(player, catname), await pointsFromSteamID(opponent, catname), result);

          deltaElo[player] += elo.player;
          deltaElo[opponent] += elo.opponent;

        }

      }
    }

  }

  // Return the point deltas separated by category
  return catDeltaElo;

}

/**
 * Applies the elo change to a user
 *
 * @param steamid
 * @param cat
 * @param weekNumber
 * @param {Object} catDeltaElo The elo delta for each player
 * @param {unknown} context The context object, defaults to epochtal
 * @returns {Promise<Object>} The user profile, in case further actions with it are required
 */
async function applyPointsDeltaForUser (steamid, cat, weekNumber, catDeltaElo, context = epochtal) {
  const profile = await profiledata(["get", steamid], context);

  if (!(cat in profile.statistics)) profile.statistics[cat] = [];
  if (!(cat in profile.weeks)) profile.weeks[cat] = [];

  profile.statistics[cat].push(catDeltaElo[cat][steamid]);

  profile.weeks[cat].push(weekNumber);
  if (!profile.weeks.total.includes(weekNumber)) {
    profile.weeks.total.push(weekNumber);
  }

  return profile;
}

/**
 * Handles the `points` utility call. This utility is used to manage user points/elo.
 *
 * The following subcommands are available:
 * - `user`: Get the total and display elo for a user
 * - `calculate`: Calculate the elo delta for this week
 * - `award`: Award elo to each user
 * - `rebuild`: Reset all user statistics and recalculate points from archive data
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, category] = args;

  const file = context.file.users;
  const users = context.data.users;

  const categoryList = await categories(["list"], context);

  switch (command) {

    case "user": {

      // Ensure a valid category is provided
      if (!categoryList.includes(category)) throw new UtilError("ERR_CATEGORY", args, context);

      // Ensure user is provided
      const steamid = args[2];
      if (!steamid) throw new UtilError("ERR_ARGS", args, context);

      const profile = await profiledata(["get", steamid], context);

      // Return total and display points for specified user in the given category for all weeks
      return {
        total: calculateTotalPoints(profile.statistics[category]),
        display: calculateDisplayPoints(profile.statistics[category])
      };

    }

    case "calculate": {

      return await calculatePointsDelta(context);

    }

    case "award": {

      // Calculate the points delta for each category in this week
      const catDeltaElo = await calculatePointsDelta(context);

      // Get the week number for the active week
      const weekNumber = context.data.week.number;

      // Award the points to each user
      for (const cat in catDeltaElo) {
        for (const steamid in catDeltaElo[cat]) {

          const profile = await applyPointsDeltaForUser(steamid, cat, weekNumber, catDeltaElo, context);

          // Recalculate the display points for the user
          users[steamid].points[cat] = calculateDisplayPoints(profile.statistics[cat]);

          profiledata(["flush", steamid], context);

        }
      }

      // Write the changes to the users file if it exists
      if (file) Bun.write(file, JSON.stringify(users));

      return "SUCCESS";

    }

    case "rebuild": {

      // Reset all user statistics
      for (const steamid in users) {
        const profile = await profiledata(["get", steamid], context);
        profile.statistics = {};
        profile.weeks = { total: [] };
      }

      // Calculate the points delta for each week and add it to the user's statistics
      const archiveList = (await archive(["list"], context)).reverse();
      for (const week of archiveList) {

        const archiveContext = await archive(["get", week], context);
        const catDeltaElo = await calculatePointsDelta(archiveContext);
        const weekNumber = archiveContext.data.week.number;

        for (const cat in catDeltaElo) {
          for (const steamid in catDeltaElo[cat]) {
            await applyPointsDeltaForUser(steamid, cat, weekNumber, catDeltaElo, context);
          }
        }

      }

      // Calculate the display points for each user in each category
      for (const steamid in users) {
        const profile = await profiledata(["get", steamid], context);
        users[steamid].points = {};
        for (const cat in profile.statistics) {
          users[steamid].points[cat] = calculateDisplayPoints(profile.statistics[cat]);
        }
        await profiledata(["flush", steamid], context);
      }

      // Write the changes to the users file if it exists
      if (file) Bun.write(file, JSON.stringify(users));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
