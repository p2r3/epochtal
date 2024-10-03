const fs = require("node:fs");

const spplice = require("../util/spplice.js");
const tmppath = require("../util/tmppath.js");

/**
 * Builds the Epochtal Live Spplice package
 *
 * @param {unknown} context An Epochtal context object
 * @returns {string} The result of the routine
 */
async function rebuildPackage (context) {

  // Remove existing Epochtal live package (if any)
  if (await spplice(["get", "epochtal-live"])) {
    await spplice(["remove", "epochtal-live"]);
  }

  // This is where we source the package files from
  const defaults = `${__dirname}/../defaults/live`;

  // Create a temporary directory for building the package
  const portal2 = await tmppath();
  fs.mkdirSync(portal2);

  // Create required directories
  fs.mkdirSync(`${portal2}/maps`);
  fs.mkdirSync(`${portal2}/maps/workshop`);
  // Copy game files to temporary directory
  fs.copyFileSync(`${defaults}/main.js`, `${portal2}/main.js`);
  fs.copyFileSync(`${defaults}/polyfill.js`, `${portal2}/polyfill.js`);
  // Write the server's HTTP address to a file
  await Bun.write(`${portal2}/address.txt`, `${gconfig.https ? "https" : "http"}://${gconfig.domain}`);

  try {
    // Build the new package
    await spplice(["add",
      "epochtal-live",
      // The game file directory we just built
      portal2,
      "Epochtal Live",
      "PortalRunner",
      // Since the thumbnail doesn't change, the path is always the same
      `${defaults}/thumbnail.png`,
      "Competitive multiplayer in Portal 2.<br>Zero resets, one attempt, many maps.",
      2990
    ]);
  } finally {
    // Clean up once we're done, or if the command failed
    fs.rmSync(portal2, { recursive: true });
  }

  return "SUCCESS";

}

module.exports = {
  rebuildPackage
};
