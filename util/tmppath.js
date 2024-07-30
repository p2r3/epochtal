const { existsSync } = require("node:fs");
const path = require("path");

/**
 * Generates a random alphanumeric string of a given length
 *
 * @param {Number} len The length of the string to generate
 * @returns {String} The generated string
 */
function randomString (len) {

  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let output = "";

  for (let i = 0; i < len; i ++) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }

  return output;

};

/**
 * Handles the `tmppath` utility call. This utility is used to generate a temporary file path.
 *
 * @param {Number} len The length of the random string to generate (defaults to 8)
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string} The output of the call
 */
module.exports = async function (len = 8, context = null) {

  if (Array.isArray(len)) len = len[0];
  if (!len) len = 8;

  let output;
  do {
    output = path.join(`${gconfig.datadir}/.tmp/${randomString(len)}`);
  } while (existsSync(output));

  return output;

};
