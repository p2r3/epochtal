// > The plan is to have the user setup only the bare minimum, and then have the server create the rest.
// > Once secrets, binaries and some basic configuration is set up, the first launch will put epochtal into
// > a fully usable state, having a first week and everything set up.
// - PancakeTAS

const fs = require("fs");
const { CONFIG } = require("./config.ts");

/**
 * Ensure a directory exists, creating it if it doesn't.
 *
 * @author PancakeTAS
 * @param {string} dir The directory to ensure.
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

/**
 * Ensure a file exists, creating it with the provided content if it doesn't.
 *
 * @author PancakeTAS
 * @param {string} file The file to ensure.
 * @param {string} content The content to write to the file if it doesn't exist
 */
async function ensureFile(file, content) {
  if (!fs.existsSync(file)) {
    await Bun.write(file, content);
  }
}

/**
 * Validate the global config and the basic directory structure.
 *
 * @author PancakeTAS
 * @returns {boolean} Whether the setup is valid or not.
 */
async function validate() {
  // Make sure bspsrc exists
  if (!fs.existsSync(`${CONFIG.DIR.BIN}/bspsrc`)) {
    console.log("BSPSource is not installed, epochtal will not function properly without it.");
    console.log("> https://github.com/ata4/bspsrc/releases");
    return false;
  }

  // Make sure mdp-json exists
  if (!fs.existsSync(`${CONFIG.DIR.BIN}/mdp-json`)) {
    console.log("mdp-json is not installed, epochtal will not function properly without it.");
    console.log("> https://github.com/p2r3/mdp-json");
    return false;
  }

  // Make sure UntitledParser exists
  if (!fs.existsSync(`${CONFIG.DIR.BIN}/UntitledParser`)) {
    console.log("UntitledParser is not installed, epochtal will not function properly without it.");
    console.log("> https://github.com/UncraftedName/UntitledParser/releases");
    return false;
  }

  // Validate secretsdir
  if (CONFIG.USE_TLS && (!fs.existsSync(`${CONFIG.DIR.SECRETS}/fullchain.pem`) || !fs.existsSync(`${CONFIG.DIR.SECRETS}/privkey.pem`))) {
    console.log("TLS is enabled, but fullchain.pem and privkey.pem are missing from secretsdir.");
    console.log("> Generate self-signed certificates or obtain them from a certificate authority.");
    return false;
  }

  if (!fs.existsSync(`${CONFIG.DIR.SECRETS}/weights.js`)) {
    console.log("weights.js is missing from secretsdir. Dumping default weights...");
    await Bun.write(`${CONFIG.DIR.SECRETS}/weights.js`, `module.exports = ${JSON.stringify(WEIGHTS, null, 2)};`);
  }


  // Validate basic datadir structure

  ensureDir(`${CONFIG.DIR.DATA}`);
  ensureDir(`${CONFIG.DIR.DATA}/.tmp`);
  ensureDir(`${CONFIG.DIR.DATA}/archives`);
  ensureDir(`${CONFIG.DIR.DATA}/profiles`);
  ensureDir(`${CONFIG.DIR.DATA}/spplice`);
  ensureDir(`${CONFIG.DIR.DATA}/week`);
  ensureDir(`${CONFIG.DIR.DATA}/week/proof`);
  ensureDir(`${CONFIG.DIR.DATA}/week/maps`);
  ensureDir(`${CONFIG.DIR.DATA}/week/mdp`);

  await ensureFile(`${CONFIG.DIR.DATA}/users.json`, "{}");
  await ensureFile(`${CONFIG.DIR.DATA}/entgraphs.json`, "{}");
  await ensureFile(`${CONFIG.DIR.DATA}/suggestions.json`, "[]");
  await ensureFile(`${CONFIG.DIR.DATA}/util.error`, "");
  await ensureFile(`${CONFIG.DIR.DATA}/util.print`, "");
  await ensureFile(`${CONFIG.DIR.DATA}/spplice/index.json`, `{"packages":[]}`);
  await ensureFile(`${CONFIG.DIR.DATA}/week/config.json`, `{"categories":[],"votingmaps":[{"id":"140534764"}],"votes":{},"number":0,"date":0}`);
  await ensureFile(`${CONFIG.DIR.DATA}/week/leaderboard.json`, "{}");
  await ensureFile(`${CONFIG.DIR.DATA}/week/week.log`, "");
  await ensureFile(`${CONFIG.DIR.DATA}/week/mdp/filesum_whitelist.txt`, "");
  await ensureFile(`${CONFIG.DIR.DATA}/week/mdp/sar_whitelist.txt`, "");

  // Validate process environment
  if (!process.env.STEAM_API_KEY) {
    console.error("STEAM_API_KEY is missing. Epochtal cannot run unless this variable is present.");
    return false;
  }
  if (!process.env.DISCORD_API_KEY) {
    console.error("DISCORD_API_KEY is missing. Epochtal cannot run unless this variable is present.");
    return false;
  }
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing. Epochtal cannot run unless this variable is present.");
    return false;
  }
  if (!process.env.INTERNAL_SECRET) {
    console.error("INTERNAL_SECRET is missing. Epochtal cannot run unless this variable is present.");
    return false;
  }
  if (!process.env.DISCORD_CHANNEL_ANNOUNCE) {
    console.error("DISCORD_CHANNEL_ANNOUNCE is missing. Epochtal cannot run unless this variable is present.");
    return false;
  }
  if (!process.env.DISCORD_CHANNEL_REPORT) {
    console.error("DISCORD_CHANNEL_REPORT is missing. Epochtal cannot run unless this variable is present.");
    return false;
  }
  if (!process.env.DISCORD_CHANNEL_UPDATE) {
    console.error("DISCORD_CHANNEL_UPDATE is missing. Epochtal cannot run unless this variable is present.");
    return false;
  }

  return true;
}

/**
 * Setup the epochtal server on first launch.
 *
 * @author PancakeTAS
 */
async function setup () {

  const routines = require("./util/routine.js");
  const categories = require("./util/categories.js");

  // Get epochtal up and running
  await routines(["run", "epochtal", "concludeWeek"]);
  await routines(["run", "epochtal", "releaseMap"]);

  // Create traditional categories
  await categories(["add", "main", "Inbounds CM", false, false, false, "demo", true]);
  await categories(["add", "lp", "Least Portals", true, false, false, "any", true]);
  await categories(["add", "ppnf", "Portal Placement Never Fail", false, false, false, "demo", false]);
  await categories(["add", "tas", "Tool Assisted Speedrun", false, false, false, "any", false]);
  await categories(["add", "meme", "Meme", false, false, false, "video", false]);
  await categories(["add", "coop", "Co-op Mode", false, true, false, "demo", true]);

  // Delete first archive
  fs.rmSync(`${CONFIG.DIR.DATA}/archives/week0`, { recursive: true, force: true });

  // Build the Epochtal Live package
  await routines(["run", "live", "rebuildPackage"]);

  // Create first run file
  await Bun.write(`${CONFIG.DIR.DATA}/.first-run`, "");
}

module.exports = {
  validate,
  setup
};

// default weights
const WEIGHTS = {
  v1: {
    PREVIEWS: 1,
    PREVIEWS_EXTRA: 1,
    PREVIEWS_VIDEO: 1,
    TAGS_COUNT: 1,
    TAGS_VISUALS: 1,
    HAMMER: 1,
    FILENAME: 1,
    DESC_NEWLINE: 1,
    DESC_FORMATTING: 1,
    REVISION: 1,
    TEXT_TURRETS: 1,
    TEXT_BEEMOD: 1,
    TEXT_RECREATION: 1,
    TITLE_LENGTH: 1,
    TITLE_CASE: 1,
    PLAYTIME_GAME: 1,
    PLAYTIME_EDITOR: 1,
    AUTHOR_WORKSHOP: 1
  },
  v2: {
    QUALITY_DEFAULT: 1,
    QUALITY_PUNISH: 1,
    SCORE_EXPONENT: 1,
    GROUPING_DEPTH: 1
  }
};
