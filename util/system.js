const UtilError = require("./error.js");

const process = require("process");
const { spawn } = require("child_process");

/**
 * Handles the `system` utility call. This utility is used to restart or shut down the system.
 *
 * The following subcommands are available:
 * - `restart`: Restart the system after delay seconds `args[1]` (default 3)
 * - `shutdown`: Shut down the system after a delay seconds `args[1]` (default 3)
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string} The output of the call
 */
module.exports = function (args, context) {

  const [command] = args;

  switch (command) {

    case "restart": {

      let time = args[1];
      if (time === undefined) time = 3;

      // Detach the process and restart the system
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

      // Detach the process and shut down the system
      setTimeout(function () {
        process.exit();
      }, 1000 * time);

      return `The system will shut down in ${time.toFixed(2)} seconds.`;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};