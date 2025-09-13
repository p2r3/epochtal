const fs = require("node:fs");

const spplice = require("../util/spplice.js");
const tmppath = require("../util/tmppath.js");
const lobbies = require("../util/lobbies.js");
const discord = require("../util/discord.js");
const {CONFIG} = require("../config.ts");
const {sanitizeForDiscord} = require("../common.js");

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

  // Get the server's HTTP(S) address
  const address = `${CONFIG.USE_HTTPS ? "https" : "http"}://${CONFIG.WEB_URL}`;

  // Create required directories
  fs.mkdirSync(`${portal2}/maps`);
  fs.mkdirSync(`${portal2}/maps/workshop`);
  fs.mkdirSync(`${portal2}/cfg`);
  fs.mkdirSync(`${portal2}/scripts`);
  fs.mkdirSync(`${portal2}/scripts/vscripts`);
  // Copy game files to a temporary directory
  fs.copyFileSync(`${defaults}/main.js`, `${portal2}/main.js`);
  fs.copyFileSync(`${defaults}/valve.rc`, `${portal2}/cfg/valve.rc`);
  // Copy mapspawn.nut, include server URL as a constant
  let mapspawn = await Bun.file(`${defaults}/mapspawn.nut`).text();
  mapspawn = `const EPOCHTAL_URL = "${address}";\n\n` + mapspawn;
  await Bun.write(`${portal2}/scripts/vscripts/mapspawn.nut`, mapspawn);

  // Write the server's HTTP address to a file
  await Bun.write(`${portal2}/address.txt`, address);

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

/**
 * Creates a lobby for the "Chamber Of The Day"
 *
 * @param {unknown} context An Epochtal context object
 * @returns {string} The result of the routine
 */
async function createCOTD (context) {

  // Create the lobby
  const createResponse = await lobbies(["create", "Chamber Of The Day", ""], context);
  const lobbyid = createResponse.split(" ")[1];

  // Set the lobby mode to Chamber Of The Day
  await lobbies(["mode", lobbyid, "cotd"], context);
  // Since COTD inherits Battle Royale properties, the lobby size gets
  // automatically restricted to zero. We unrestrict it here:
  await lobbies(["maxplayers", lobbyid, null], context);

  // Permanently remove the lobby host
  await lobbies(["host", lobbyid, null], context);

  const trySetMap = async function () {
    try {

      await lobbies(["map", lobbyid, "random"], context);

      // Get the map information from the lobby data
      const lobbyMap = context.data.lobbies.data[lobbyid].context.data.map;
      const mapName = lobbyMap.title.replaceAll("_", "").replaceAll("*", "").replaceAll("#", "").replaceAll("@", "");
      const mapAuthor = lobbyMap.author.replaceAll("_", "").replaceAll("*", "").replaceAll("#", "").replaceAll("@", "");
      const mapLink = `https://steamcommunity.com/sharedfiles/filedetails/?id=${lobbyMap.id}`;
      const mapString = `[**${sanitizeForDiscord(mapName)}** by **${sanitizeForDiscord(mapAuthor)}**](${mapLink})`;

      // Announce the beginning of COTD on Discord
      await discord(["live", `${CONFIG.DISCORD.ROLE.COTD}The [Chamber Of The Day](<https://epochtal.p2r3.com/live>) is starting!\n${mapString}`], context);

    } catch {
      setTimeout(trySetMap, 3000);
    }
  };
  await trySetMap();

  // Warn players of game start in lobby chat
  setTimeout(async function () {
    try {
      await lobbies(["chat", lobbyid, `<br>Get ready! The game starts in 1 minute.<br>
        Make sure you've <a href="https://docs.google.com/document/d/1gcWvwEjzJaKfgOEGpGPFGvtNV_LQCbSC3OE84dARMYE">linked your game client with a token</a>.`, null], context);
    } catch { }
  }, 19 * 60 * 1000);
  setTimeout(async function () {
    try {
      await lobbies(["chat", lobbyid, "Game starts in 15 seconds.", null], context);
    } catch { }
  }, 20 * 60 * 1000 - 15 * 1000);
  for (let i = 1; i <= 5; i ++) {
    const time = i;
    setTimeout(async function () {
      try {
        await lobbies(["chat", lobbyid, `Game starts in ${time} seconds.`, null], context);
      } catch { }
    }, 20 * 60 * 1000 - time * 1000);
  }

  // Schedule game start for 20 minutes from lobby creation
  setTimeout(async function () {
    try {
      await lobbies(["start", lobbyid], context);
    } catch { }
  }, 20 * 60 * 1000);

  return "SUCCESS";

}

module.exports = {
  rebuildPackage,
  createCOTD
};
