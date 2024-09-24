const fs = require("node:fs");
const path = require("node:path");

// Get environment variables from .env file
require("dotenv").config();

// Ensure main config exists
const gconfigpath = `${__dirname}/config.json`;
if (!fs.existsSync(gconfigpath)) {
  console.log("No global config file found. Deploying default config...");
  await Bun.write(gconfigpath, JSON.stringify({
    domain: process.env.WEB_URL || "localhost:8080",
    port: 8080,
    tls: process.env.USE_TLS === "true",
    https: process.env.USE_HTTPS === "true",
    secretsdir: `${__dirname}/secrets`,
    datadir: `${__dirname}/data`,
    bindir: `${__dirname}/bin`
  }));
}

// Load the global config
const gconfig = await Bun.file(gconfigpath).json();
global.isFirstLaunch = !fs.existsSync(`${gconfig.datadir}/.first-run`);
global.gconfig = gconfig;

// Validate the global config
const validate = require(`${__dirname}/validate.js`);
if (!await validate.validate()) {
  console.log("Validation failed. Exiting...");
  process.exit(1);
}

/**
 * The global `epochtal` object makes all context data for epochtal globally available. This is to skip
 * waiting for file I/O everywhere else later on.
 *
 * The `file` entry contains references to all files and directories on disk that are being used by epochtal.
 *
 * The `data` entry parses a lot of these files into a more readable object format for better integration
 * with the code.
 *
 * The `name` field can be omitted, but helps keeping track of different contexts in environments where
 * that's necessary.
 *
 * @type {{file: {}, data: {}, name: string}}
 */
global.epochtal = { file: {}, data: {}, name: "epochtal" };

// Load files into the global context
epochtal.file = {
  leaderboard: Bun.file(`${gconfig.datadir}/week/leaderboard.json`),
  users: Bun.file(`${gconfig.datadir}/users.json`),
  profiles: `${gconfig.datadir}/profiles`,
  week: Bun.file(`${gconfig.datadir}/week/config.json`),
  log: `${gconfig.datadir}/week/week.log`,
  vmfs: `${gconfig.datadir}/week/maps`,
  portal2: `${__dirname}/defaults/portal2`,
  demos: `${gconfig.datadir}/week/proof`,
  spplice: {
    repository: `${gconfig.datadir}/spplice`,
    index: Bun.file(`${gconfig.datadir}/spplice/index.json`)
  },
  mdp: {
    filesums: `${gconfig.datadir}/week/mdp/filesum_whitelist.txt`,
    sarsums: `${gconfig.datadir}/week/mdp/sar_whitelist.txt`
  }
};

// Parse data from files and load it into the global context
epochtal.data = {
  leaderboard: await epochtal.file.leaderboard.json(),
  users: await epochtal.file.users.json(),
  profiles: {},
  week: await epochtal.file.week.json(),
  discord: {
    announce: process.env.DISCORD_CHANNEL_ANNOUNCE,
    report: process.env.DISCORD_CHANNEL_REPORT,
    update: process.env.DISCORD_CHANNEL_UPDATE
  },
  spplice: {
    address: `${gconfig.https ? "https" : "http"}://${gconfig.domain}`,
    index: await epochtal.file.spplice.index.json()
  },
  // Epochtal Live
  lobbies: { list: {}, data: {} },
  events: {},
  gameauth: {}
};

// Import dependencies for Discord integration
const Discord = require("discord.js");

/**
 * A globally available instance of the Discord client. Letting this be global makes it more easily accessible without
 * needing to set up the client more than once.
 *
 * @type {Client<boolean>}
 */
global.discordClient = new Discord.Client({
  partials: ["CHANNEL"],
  intents: 1 + 512 // Guilds, guild messages
});

// Log in to the Discord client and set its state
discordClient.login(process.env.DISCORD_API_KEY);
discordClient.once("ready", function () {
  discordClient.user.setActivity("Portal 2", { type: 5 });
});

const utilsdir = fs.readdirSync("./util");

/**
 * The utilities made available to the application. Utilities are self-contained modules that perform smaller tasks.
 *
 * @type {{}}
 */
const utils = {};
// Load utils from "utilsdir"
utilsdir.forEach(util => {
  util = util.split(".js")[0];
  utils[util] = require("./util/" + util);
});

const apisdir = fs.readdirSync("./api");

/**
 * The APIs made available to the application. These will primarily be used by some external service making an HTTP call
 * to this application.
 *
 * @type {{}}
 */
const apis = {};
// Load APIs from "apisdir"
apisdir.forEach(api => {
  api = api.split(".js")[0];
  apis[api] = require("./api/" + api);
});

/**
 * The `UtilError` field is a local class reference to the `error` utility. This lets the
 * application throw more readable error messages.
 */
const UtilError = utils["error"];

const profilesdir = fs.readdirSync(epochtal.file.profiles);
// Load profiles from "profilesdir" into the global epochtal data
profilesdir.forEach(steamid => {
  const dataPath = `${epochtal.file.profiles}/${steamid}/data.json`;
  epochtal.data.profiles[steamid] = require(dataPath);
});

/**
 * This function handles all requests made to the web server.
 *
 * @param {HttpRequest} req The request made to the web server
 * @returns {Promise<Response|*>} The response to send back to the client. May be formatted as JSON for API calls, or be
 * any other file for viewing in a web browser.
 */
const fetchHandler = async function (req) {

  // Get the URL and separate the path into an array
  const url = new URL(req.url);
  const urlPath = url.pathname.split("/").slice(1);
  const userAgent = req.headers.get("User-Agent");

  // Handle API calls
  if (urlPath[0] === "api") {

    // Get the correct API to call
    const api = apis[urlPath[1]];
    // Decode the rest of the path as arguments for the relevant API
    const args = urlPath.slice(2).map(decodeURIComponent);

    // Try to parse all API arguments as JSON. If it fails, leave it as a string.
    for (let i = 0; i < args.length; i ++) {
      try {
        args[i] = JSON.parse(args[i]);
      } catch { } // Leave it as a string
    }

    // Try to call the previously defined API with the parsed arguments, catching any errors if it fails
    let output;
    try {
      output = await api(args, req);
    } catch (err) {
      // If a util throws an expected error, pass just its message to the client
      if (err instanceof UtilError) {
        return Response.json(err.message);
      }
      // Otherwise, it's probably much worse, so pass the full stack
      err = new UtilError("ERR_UNKNOWN: " + err.message, args, epochtal, urlPath[1], err.stack);
      return Response.json(err.toString(), { status: 500 });
    }

    // Make sure the response is in the correct format before returning it
    if (output instanceof Response) return output;
    return Response.json(output);

  }

  // Make sure the user is an admin if trying to call anything under /util or /admin.
  if (urlPath[0] === "util" || urlPath[0] === "admin") {

    const user = await apis.users(["whoami"], req);
    if (!user) return Response("ERR_LOGIN", { status: 403 });
    if (!user.epochtal.admin) return Response("ERR_PERMS", { status: 403 });

  }

  // Handle utility calls
  if (urlPath[0] === "util") {
    if (req.method !== "POST") return Response("ERR_METHOD", { status: 405 });

    // Get the utility to call
    const util = utils[urlPath[1]];
    // Decode the rest of the path as arguments for the utility
    const args = urlPath.slice(2).map(decodeURIComponent);

    // Return 404 if the utility does not exist
    if (!util) return Response("ERR_UTIL", { status: 404 });

    // Try to parse all arguments as JSON. Leave arguments that fail JSON decode as a string.
    for (let i = 0; i < args.length; i ++) {
      try {
        args[i] = JSON.parse(args[i]);
      } catch { } // Leave it as a string
    }

    // Try to call the utility with the provided arguments
    let result;
    try {
      result = await util(args);
    } catch (err) {
      // Pass the full stack if the error is not a UtilError
      if (!(err instanceof UtilError)) {
        err = new UtilError("ERR_UNKNOWN: " + err.message, args, epochtal, urlPath[1], err.stack);
      }
      return Response.json(err.toString());
    }

    return Response.json(result);

  }

  // Handle Spplice calls
  if (!userAgent || userAgent.startsWith("Bun/") || userAgent.includes("spplice/2")) {

    const path = `${epochtal.file.spplice.repository}/${urlPath[0]}`;
    if (!fs.existsSync(path) || !urlPath[0]) {
      return Response.json(await utils.spplice(["get"]));
    }

    return Response(Bun.file(path));

  }

  const file404 = Bun.file(`${__dirname}/pages/404.html`);

  // Decode the URL and make sure it points to a file
  let pathDecoded = decodeURIComponent(url.pathname.split("#")[0]);
  if (pathDecoded.endsWith("/")) pathDecoded += "index.html";

  // Detects probable path traversal attempts, better safe than sorry
  if (path.normalize(pathDecoded) !== pathDecoded) {
    return Response(file404, { status: 404 });
  }

  let outputFilePath = "pages" + pathDecoded;

  // Check if the file exists
  if (!fs.existsSync(outputFilePath)) {
    return Response(file404, { status: 404 });
  }
  // Fetch the index.html file if the path is pointing to a directory
  if (fs.lstatSync(outputFilePath).isDirectory()) {
    outputFilePath += "/index.html";
  }

  const file = Bun.file(outputFilePath);

  // Check if the file is empty
  if (file.size === 0) {
    return Response(file404, { status: 404 });
  }

  // Finally, if all checks pass, return the file to the client
  return Response(file);

};

// Start a Bun web server with fetchHandler() as the function to handle requests
const servercfg = {
  port: gconfig.port,
  fetch: fetchHandler,
  websocket: {
    open: await utils.events(["wshandler", "open"]),
    message: await utils.events(["wshandler", "message"]),
    close: await utils.events(["wshandler", "close"])
  }
};

if (gconfig.tls) {
  servercfg.tls = {
    key: Bun.file(`${gconfig.secretsdir}/privkey.pem`),
    cert: Bun.file(`${gconfig.secretsdir}/fullchain.pem`)
  };
}

const server = Bun.serve(servercfg);
epochtal.data.events.server = server;

console.log(`Listening on ${gconfig.tls ? "https" : "http"}://localhost:${server.port}...`);

// Schedule routines
utils.routine(["schedule", "epochtal", "concludeWeek", "0 0 15 * * 7"]);
utils.routine(["schedule", "epochtal", "releaseMap", "0 0 12 * * 1"]);

// Register events
utils.events(["create", "utilError", steamid => epochtal.data.users[steamid].admin]);
utils.events(["create", "utilPrint", steamid => epochtal.data.users[steamid].admin]);

// Prepare first launch
if (isFirstLaunch) {
  console.log(`> Looks like this is the first time you're running Epochtal. We'll need to set up some things first.
> First things first, head to the Epochtal page and log in with Steam. You will automatically be
> made an admin and Epochtal will run two routines to set up the first week. Do note, that this will
> take quite a bit, as it will run the curation algorithm in its entirety!`);
}
