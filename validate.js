// > The plan is to have the user set up only the bare minimum and then have the server create the rest.
// > Once secrets, binaries and some basic configuration are set up, the first launch will put epochtal into
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
    console.log("Required dependency BSPSource not found in BIN_DIR. (filename 'bspsrc')");
    console.log("> Download from https://github.com/ata4/bspsrc/releases");
    return false;
  }

  // Make sure mdp-json exists
  if (!fs.existsSync(`${CONFIG.DIR.BIN}/mdp-json`)) {
    console.log("Required dependency mdp-json not found in BIN_DIR. (filename 'mdp-json')");
    console.log("> Download from https://github.com/p2r3/mdp-json");
    return false;
  }

  // Make sure UntitledParser exists
  if (!fs.existsSync(`${CONFIG.DIR.BIN}/UntitledParser`)) {
    console.log("Required dependency UntitledParser not found in BIN_DIR. (filename 'UntitledParser')");
    console.log("> Download from https://github.com/UncraftedName/UntitledParser/releases");
    return false;
  }

  // Validate secrets directory
  if (CONFIG.USE_TLS && (!fs.existsSync(`${CONFIG.DIR.SECRETS}/fullchain.pem`) || !fs.existsSync(`${CONFIG.DIR.SECRETS}/privkey.pem`))) {
    console.log("TLS is enabled, but 'fullchain.pem' and/or 'privkey.pem' are missing from SECRETS_DIR.");
    console.log("> Please generate or obtain valid certificates and populate SECRETS_DIR.");
    return false;
  }

  if (!fs.existsSync(`${CONFIG.DIR.SECRETS}/weights.js`)) {
    console.log("'weights.js' is missing from SECRETS_DIR. Dumping default weights...");
    await Bun.write(`${CONFIG.DIR.SECRETS}/weights.js`, `module.exports = ${JSON.stringify(WEIGHTS, null, 2)};`);
  }

  // Validate basic data directory structure
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

  return true;
}

/**
 * Set up the Epochtal server on the first launch.
 *
 * @author PancakeTAS
 */
async function setup () {
  const routines = require("./util/routine.js");
  const categories = require("./util/categories.js");

  // Get Epochtal up and running
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

  // Create a first-run file
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
