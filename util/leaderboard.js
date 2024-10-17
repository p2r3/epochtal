const UtilError = require("./error.js");

const categories = require("./categories.js");
const weeklog = require("./weeklog.js");

/**
 * Adds a placement index to each run.
 * @param {object[]} lb An array of runs representing the leaderboard
 */
function calculatePlacement (lb) {

  let placement = 1;
  for (let i = 0; i < lb.length; i ++) {

    if (i !== 0 && lb[i].time !== lb[i-1].time) {
      placement ++;
    }
    lb[i].placement = placement;

  }

};

/**
 * Handles the `leaderboard` utility call. Manages the leaderboard for a given category.
 *
 * The following subcommands are available:
 * - `list`: List all categories with leaderboards (minimum 1 run)
 * - `get`: List all runs in category `args[1]`
 * - `remove`: Remove a player's run from the given category by steamid `args[2]`
 * - `add`: Add a run to the category `args[1]` for the player with steamid `args[2]`
 * - `edit`: Edit the run note for the player with steamid `args[2]` in the category `args[1]`
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  // Parse the arguments and fetch the necessary data
  const [command, category, steamid] = args;

  const data = context.data.leaderboard;
  const file = context.file.leaderboard;

  let categoryData;
  if (category) {
    categoryData = await categories(["get", category], context);
  }

  let lb;
  if (categoryData) {
    // Find or create the leaderboard for the given category
    if (!(category in data)) data[category] = [];
    lb = data[category];
  }

  switch (command) {

    case "list": {

      return Object.keys(data);

    }

    case "get": {

      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);
      return lb;

    }

    case "remove": {

      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);

      // Whether the run should be purged from the weeklog (true by default)
      const purge = args[3] === undefined ? true : args[3];

      // Find the run to remove
      const idx = lb.findIndex(function (curr) {
        return curr.steamid === steamid;
      });

      if (idx === -1) throw new UtilError("ERR_NOTFOUND", args, context);

      // Remove the run from the leaderboard
      lb.splice(idx, 1);

      // Recalculate placement indices
      calculatePlacement(lb);

      // Write the changes to file
      if (file) Bun.write(file, JSON.stringify(data));

      // Log the removal
      await weeklog(["add", steamid, category, 0, purge ? 1 : 0], context);

      return "SUCCESS";

    }

    case "add": {

      // Ensure the category exists and is not locked
      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);
      if (categoryData.lock) throw new UtilError("ERR_LOCKED", args, context);

      // Parse arguments and validate them
      const [time, note, portals, segmented] = args.slice(3);

      for (let i = 2; i <= 4; i ++) {
        if (args[i] === undefined) throw new UtilError("ERR_ARGS", args, context);
      }

      if (isNaN(time) || time <= 0) throw new UtilError("ERR_TIME", args, context);

      if (note.length > 200) throw new UtilError("ERR_NOTE", args, context);

      // Grab portal count if the category requires it
      if (!("portals" in categoryData)) throw new UtilError("ERR_CATEGORY", args, context);
      const countPortals = categoryData.portals;
      if (countPortals && isNaN(portals)) throw new UtilError("ERR_PORTALS", args, context);

      // Grab coop partners if the category requires it
      const partners = context.data.week.partners;

      if (categoryData.points && !categoryData.coop && steamid in partners) {
        throw new UtilError("ERR_PARTNERLOCK", args, context);
      }

      // Remove the old run if it exists
      const oldRunIndex = lb.findIndex(function (curr) {
        if (categoryData.coop) {
          return curr.steamid === steamid || curr.steamid === partners[steamid];
        } else {
          return curr.steamid === steamid;
        }
      });
      if (oldRunIndex !== -1) lb.splice(oldRunIndex, 1);

      // Insert the new run into the leaderboard
      const newRun = {
        steamid: steamid.toString(),
        time: Number(time),
        note: note.toString()
      };

      let inserted = false;

      if (countPortals) {

        newRun.portals = portals;
        newRun.segmented = segmented;

        for (let i = 0; i < lb.length; i ++) {

          if (portals > lb[i].portals) continue;

          if (portals === lb[i].portals) {
            if (segmented && !lb[i].segmented) continue;
            if (segmented === lb[i].segmented) {
              if (time >= lb[i].time) continue;
            }
          }

          lb.splice(i, 0, newRun);
          inserted = true;
          break;

        }

      } else {

        for (let i = 0; i < lb.length; i ++) {

          if (time >= lb[i].time) continue;

          lb.splice(i, 0, newRun);
          inserted = true;
          break;

        }

      }

      if (!inserted) lb.push(newRun);

      // Recalculate placement indices
      calculatePlacement(lb);

      // Write the changes to the leaderboard
      if (file) Bun.write(file, JSON.stringify(data));

      // Log the addition
      await weeklog(["add", steamid, category, time, portals], context);

      return "SUCCESS";

    }

    case "edit": {

      // Validate parameters
      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);
      if (categoryData.lock) throw new UtilError("ERR_LOCKED", args, context);

      const note = args[3];
      if (note === undefined) throw new UtilError("ERR_ARGS", args, context);

      if (note.length > 200) throw new UtilError("ERR_NOTE", args, context);

      // Edit the note
      const run = lb.find(curr => curr.steamid === steamid);
      run.note = note;

      // Write the changes to the leaderboard
      if (file) Bun.write(file, JSON.stringify(data));
      return "SUCCESS";

    }


  }

  throw new UtilError("ERR_COMMAND", args, context);

};
