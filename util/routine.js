const UtilError = require("./error.js");

const schedule = require("node-schedule");
const { readdirSync } = require("node:fs");
const discord = require("./discord.js");

const routinespath = `${__dirname}/../routines`;
const routinesdir = readdirSync(routinespath);
const routines = {};
routinesdir.forEach(routine => {
  routine = routine.split(".js")[0];
  routines[routine] = require(`${routinespath}/${routine}`);
});

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
          if (!(e instanceof UtilError)) e = new UtilError("ERR_UNKNOWN", args, context, "routine", e.stack);
          await discord(["report", `Scheduled routine \`${routine}(${func})\` failed:\`\`\`${e}\`\`\``], context);
        }
      });

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};