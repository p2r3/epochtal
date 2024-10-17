const fs = require("node:fs");
const { $ } = require("bun");

const tmppath = require("../util/tmppath.js");
const demo = require("../util/demo.js");
const discord = require("../util/discord.js");
const leaderboard = require("../util/leaderboard.js");
const categories = require("../util/categories.js");
const config = require("../util/config.js");
const users = require("../util/users.js");

const api_users = require("./users.js");

/**
 * Converts ticks to a string format.
 *
 * @param {int} t Ticks
 * @returns {string} The formatted time string
 */
function ticksToString (t) {

  // Convert ticks to hours, minutes, and seconds
  let output = "";
  const hrs = Math.floor(t / 216000),
    min = Math.floor(t / 3600),
    sec = t % 3600 / 60;

  // Format the time string
  if (hrs !== 0) output += `${hrs}:${min % 60 < 10 ? "0" : ""}${min % 60}:`;
  else if (min !== 0) output += `${min}:`;
  if (sec < 10) output += "0";
  output += sec.toFixed(3);

  return output;

}

/**
 * Pushes a run update to the discord.
 *
 * @param {string} steamid Steam user id
 * @param {string} category Category name
 */
async function discordUpdate (steamid, category) {

  const currBoard = await leaderboard(["get", category]);
  const currCategory = await categories(["get", category]);

  const run = currBoard.find(c => c.steamid === steamid);
  const user = await users(["get", steamid]);
  const time = ticksToString(run.time);

  let emoji = "🎲";
  let output = `**${user.name}**`;

  if (currCategory.coop) {
    const partners = await config(["get", "partners"]);
    const partner = await users(["get", partners[steamid]]);
    output += ` and **${partner.name}**`;
  }

  output += ` submitted a new run to "${currCategory.title}" with a time of \`${time}\``;

  if (currCategory.portals) {
    const label = currCategory.portals === true ? "portal" : currCategory.portals;
    output += ` (${run.portals} ${label}${run.portals === 1 ? "" : "s"})`;
  }

  if (currCategory.points) {
    const suffix = ["st","nd","rd"][((run.placement + 90) % 100 - 10) % 10 - 1] || "th";
    output += ` in ${run.placement}${suffix} place`;
  }

  if (currCategory.coop) emoji = "👥";
  else if (currCategory.portals) emoji = "📉";
  else if (currCategory.points) emoji = "🏁";

  await discord(["update", `${emoji} ${output}.`]);

}

/**
 * Handles `/api/leaderboard/` endpoint requests. This endpoint supports the following commands:
 *
 * - `get`: Get the current leaderboard.
 * - `submit`: Submit a new run to the leaderboard with a demo proof.
 * - `submitlink`: Submit a new run to the leaderboard with a link proof.
 * - `remove`: Remove the active user's run from the leaderboard.
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {string|object} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, category] = args;

  // Get category data if category is specified
  let categoryData;
  if (category) {
    categoryData = await categories(["get", category]);
  }

  switch (command) {

    case "get": {

      // Return the leaderboard of all categories
      return epochtal.data.leaderboard;

    }

    case "submit": { // (demo proof only)

      // Throw ERR_LOCKED if the category is locked
      if (categoryData.lock) return "ERR_LOCKED";
      // Throw ERR_PROOF if the category requires a video proof
      if (categoryData.proof === "video") return "ERR_PROOF";

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Get the user's epochtal profile and throw ERR_PROFILE if not found
      const profile = epochtal.data.profiles[user.steamid];
      if (!profile) return "ERR_PROFILE";

      // Throw ERR_BANNED if the user is banned
      if (profile.banned === true || profile.banned > Date.now()) return "ERR_BANNED";

      // Throw ERR_ARGS if the run note is invalid
      const note = args[2];
      if (note === undefined) return "ERR_ARGS";
      if (note.length > 200) return "ERR_NOTE";

      // Get a temporary path for the demo file
      const path = (await tmppath()) + ".dem";

      // Get the form data from the request
      const formData = await request.formData();
      const fileBlob = formData.get("demo");

      // Throw ERR_FILE if the file is not a binary blob
      if (!(fileBlob instanceof Blob)) return "ERR_FILE";

      // Write the file to the temporary path
      await Bun.write(path, fileBlob);

      // Verify the demo file if the category is scored or ppnf
      if (categoryData.points || category === "ppnf") {
        const verdict = await demo(["verify", path]);

        // Fail if the demo is detected as invalid, or PPNF outside of the PPNF category
        if (verdict !== "VALID" && !(verdict === "PPNF" && category === "ppnf")) {

          // Remove the demo file
          fs.rmSync(path);

          // Report the run on the discord
          const reportText = `${user.username}'s run was rejected. ${verdict}\nSteam ID: \`${user.steamid}\``;
          await discord(["report", reportText]);

          // Return the verdict to the user
          return "ERR_ILLEGAL";
        }
      }

      // Parse the demo file
      const portalOverride = categoryData.portals === true ? false : categoryData.portals;
      const data = await demo(["parse", path, portalOverride]);

      // Fail if the player's steamid does not match the demo's steamid
      if (user.steamid !== data.steamid) {
        fs.rmSync(path);
        return "ERR_STEAMID";
      }

      // Handle coop demo files accordingly
      if (data.partner) {

        // Fail if the category is not coop and a partner is specified
        if (!categoryData.coop) {
          // Remove the demo file
          fs.rmSync(path);

          // Return ERR_NOTCOOP to the user
          return "ERR_NOTCOOP";
        }

        // Grab a map of partners from the week data
        const partners = epochtal.data.week.partners;

        // Verify the partners
        if (!(data.steamid in partners || data.partner in partners)) {

          // Set the partners in the week data
          partners[data.steamid] = data.partner;
          partners[data.partner] = data.steamid;

          // Write the week data to the file
          if (epochtal.file.week) {
            await Bun.write(epochtal.file.week, JSON.stringify(epochtal.data.week));
          }

        } else if (partners[data.steamid] !== data.partner || partners[data.partner] !== data.steamid) {
          // Fail if the demo contains different partners than the week data
          fs.rmSync(path);
          return "ERR_PARTNER";
        }

      } else if (categoryData.coop) {
        // Fail if the category is coop and no partner is specified
        fs.rmSync(path);
        return "ERR_NOPARTNER";
      }

      // Try to add the run to the leaderboard
      try {
        await leaderboard(["add", category, data.steamid, data.time, note, data.portals, false]);
      } catch (e) {
        fs.rmSync(path);
        throw e;
      }

      // Move the demo file to the demos directory and compress it
      const newPath = `${epochtal.file.demos}/${data.steamid}_${category}.dem`;
      fs.renameSync(path, newPath);
      await $`xz -zf9e ${newPath}`.quiet();

      // Push the run to the discord
      discordUpdate(user.steamid, categoryData.name);

      // Return the run data to the user
      return data;

    }

    case "submitlink": {

      // Throw ERR_LOCKED if the category is locked
      if (categoryData.lock) return "ERR_LOCKED";
      // Throw ERR_PROOF if the category requires a demo proof
      if (categoryData.proof === "demo") return "ERR_PROOF";

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Ensure all arguments are provided and throw ERR_ARGS if not
      for (let i = 2; i <= 5; i ++) {
        if (args[i] === undefined) return "ERR_ARGS";
      }

      // Parse user arguments into run data
      const [link, note, time, portals] = args.slice(2);

      const data = {
        steamid: user.steamid,
        time: time,
        portals: portals
      };

      // Add the run to the leaderboard
      await leaderboard(["add", category, data.steamid, data.time, note, data.portals, true]);

      // Write the link to the demos directory
      const newPath = `${epochtal.file.demos}/${data.steamid}_${category}.link`;
      await Bun.write(newPath, link);

      // Push the run to the discord
      discordUpdate(user.steamid, categoryData.name);

      // Return the run data to the user
      return data;

    }

    case "remove": {

      // Throw ERR_LOCKED if the category is locked
      if (categoryData.lock) return "ERR_LOCKED";

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Remove the run, but don't purge from weeklog
      await leaderboard(["remove", category, user.steamid, false]);

      // Return SUCCESS to the user
      return "SUCCESS";

    }

    case "edit": {

      // Throw ERR_LOCKED if the category is locked
      if (categoryData.lock) return "ERR_LOCKED";

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      const note = args[2];

      // Try to edit the user's run note
      await leaderboard(["edit", category, user.steamid, note]);

      return "SUCCESS";

    }

  }

  return "ERR_COMMAND";

};
