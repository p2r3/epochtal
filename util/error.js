const { appendFileSync } = require("node:fs");
const events = require("./events.js");

module.exports = class UtilError extends Error {

  args = null;
  context = null;
  util = null;

  constructor (message, args, context, util = null, stack = null) {

    super(message);

    this.args = args;
    this.context = context;

    if (util) this.util = util;
    else this.util = this.stack.split("util/")[2].split(".js:")[0];

    if (stack) this.stack = stack;

    const str = `[${(new Date()).toUTCString()} UTC+0]\n${this.toString()}\n`;
    
    console.error(str);
    appendFileSync(__dirname + "/../util.error", str);
    events(["send", "utilError", str]);


  }

  toString () {

    return `${this.stack}
- Command: "${this.util} ${this.args.join(" ")}"
- Context: "${this.context.name}"`;

  }

};
