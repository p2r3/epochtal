const UtilError = require("./error.js");

const leaderboard = require("./leaderboard.js");
const categories = require("./categories.js");

async function calculatePoints (context = epochtal) {

  const boards = await leaderboard(["list"], context);
  const output = {};
  
  for (let i = 0; i < boards.length; i ++) {

    const catname = boards[i];

    const cat = await categories(["get", catname], context);
    if (!cat.points) continue;
    const lb = await leaderboard(["get", catname], context);

    const mainDistribution = [10, 5, 1];
    const baseOffset = Math.min(lb.length, 5);

    for (let j = 0; j < lb.length; j ++) {

      const run = lb[j];
      if (run.placement > 3) break;

      if (!(run.steamid in output)) output[run.steamid] = 0;

      if (catname === "main") {
        output[run.steamid] += mainDistribution[run.placement - 1];
      } else {
        output[run.steamid] += Math.max(baseOffset - run.placement - 1, 0);
      }

    }

  }

  return output;

}

module.exports = async function (args, context) {

  const [command] = args;

  switch (command) {

    case "calculate": {

      return await calculatePoints(context);

    }

    case "revoke":
    case "award": {

      const usersFile = Bun.file("./pages/users.json");
      const users = await usersFile.json();

      const awardees = calculatePoints(context);
      for (const user in awardees) {
        if (command === "revoke") users[user].points -= awardees[user];
        else users[user].points += awardees[user];
      }

      await Bun.write(usersFile, JSON.stringify(users));
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
