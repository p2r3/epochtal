const { appendFileSync } = require("node:fs");

/**
 * This class represents an error that occurred during the execution of a utility.
 * When constructed, it logs the error to the console and a file as well as publish it to the user.
 */
module.exports = class UtilError extends Error {

  args = null;
  context = null;
  util = null;

  /**
   * Constructs a new UtilError instance.
   *
   * @param {string} message Error message
   * @param {object[]} args Command arguments
   * @param {unknown} context Context on which the command was executed
   * @param {unknown} util Utility that was called
   * @param {string} stack Stack trace of the error
   */
  constructor (message, args, context, util = null, stack = null) {

    super(message);

    this.args = args;
    this.context = context;

    // Extract the utility name from the stack trace
    if (util) this.util = util;
    else this.util = this.stack.split("util/")[2].split(".js:")[0];

    if (stack) this.stack = stack;

    const str = `[${(new Date()).toUTCString()} UTC+0]\n${this.toString()}\n`;

    // Log the error to the console, a file and publish it to the user
    console.error(str);
    appendFileSync(`${gconfig.datadir}/util.error`, str);
    epochtal.data.events.server.publish("utilError", JSON.stringify(str));

  }

  toString () {

    return `${this.stack}
- Command: "${this.util} ${this.args.join(" ")}"
- Context: "${this.context.name}"`;

  }

};
