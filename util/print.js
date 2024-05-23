const { appendFileSync } = require("node:fs");

module.exports = function UtilPrint (message, context = epochtal) {

  if (Array.isArray(message)) message = message.join(" ");

  const str = `[${(new Date()).toUTCString()}]\n${message}\n`;

  console.log(str);
  appendFileSync(__dirname + "/../util.print", str);

  // return str;

};
