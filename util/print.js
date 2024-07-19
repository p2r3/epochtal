const { appendFileSync } = require("node:fs");
const events = require("./events.js");

/**
 * Handles the `utilPrint` utility call. This utility is used to print a message to the console.
 *
 * The message is also appended to a file in the util directory and logged as an event.
 *
 * @param {string[]} message The message to print
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {void} The output of the call
 */
module.exports = function UtilPrint (message, context = epochtal) {

  if (Array.isArray(message)) message = message.join(" ");

  const str = `[${(new Date()).toUTCString()}]\n${message}\n`;

  console.log(str);
  appendFileSync(__dirname + "/../util.print", str);
  events(["send", "utilPrint", str]);

};
