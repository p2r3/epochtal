const UtilError = require("./error.js");

const schedule = require("node-schedule");
const { readdirSync } = require("node:fs");
const discord = require("./discord.js");

// List all routines
const routinespath = `${__dirname}/../routines`;
const routinesdir = readdirSync(routinespath);
const routines = {};
routinesdir.forEach(routine => {
  routine = routine.split(".js")[0];
  routines[routine] = require(`${routinespath}/${routine}`);
});

/**
 * Handles the `routine` utility call. This utility is used to run or schedule routines.
 *
 * The following subcommands are available:
 * - `run`: Run routine `args[1]` with function `args[2]`
 * - `schedule`: Schedule routine `args[1]` with function `args[2]` at time `args[3]`
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, routine, func, time] = args;

  switch (command) {

    case "run": {

      return await routines[routine][func](context);

    }

    case "schedule": {

      schedule.scheduleJob(time, async function () {
        try {
          await routines[routine][func](context);
        } catch (e) {
          if (!(e instanceof UtilError)) e = new UtilError("ERR_UNKNOWN: " + e.message, args, context, "routine", e.stack);

          // Report the error to discord
          await discord(["report", `Scheduled routine \`${routine}(${func})\` failed:\`\`\`${e}\`\`\``], context);
        }
      });

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};