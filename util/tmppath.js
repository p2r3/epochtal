const { existsSync } = require("node:fs");
const path = require("path");

function randomString (len) {

  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let output = "";

  for (let i = 0; i < len; i ++) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }

  return output;

};

module.exports = async function (len = 8, context = null) {

  if (Array.isArray(len)) len = len[0];
  if (!len) len = 8;

  let output;
  do {
    output = path.join(__dirname, "../.tmp/" + randomString(len));
  } while (existsSync(output));

  return output;

};
