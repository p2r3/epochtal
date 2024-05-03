const UtilError = require("./error.js");

const process = require("process");
const { spawn } = require("child_process");

module.exports = function (args, context) {

  const [command] = args;

  switch (command) {

    case "restart": {

      let time = args[1];
      if (time === undefined) time = 3;

      setTimeout(function () {

        spawn("bun", ["run", "main.js"], {
          detached: true,
          stdio: "ignore"
        });
  
        process.exit();

      }, 1000 * time);

      return `The system will restart in ${time.toFixed(2)} seconds.`;

    }

    case "shutdown": {

      let time = args[1];
      if (time === undefined) time = 3;

      setTimeout(function () {
        process.exit();
      }, 1000 * time);

      return `The system will shut down in ${time.toFixed(2)} seconds.`;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};