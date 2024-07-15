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
  leaderboard: Bun.file(`${__dirname}/pages/leaderboard.json`),
  users: Bun.file(`${__dirname}/pages/users.json`),
  profiles: `${__dirname}/pages/profiles`,
  week: Bun.file(`${__dirname}/week.json`),
  log: `${__dirname}/pages/week.log`,
  portal2: `${__dirname}/defaults/portal2`,
  demos: `${__dirname}/demos`,
  spplice: {
    repository: `${__dirname}/pages/spplice`,
    index: Bun.file(`${__dirname}/pages/spplice/index.json`)
  }
};

// Parse data from files and load it into the global context
epochtal.data = {
  leaderboard: await epochtal.file.leaderboard.json(),
  users: await epochtal.file.users.json(),
  profiles: {},
  week: await epochtal.file.week.json(),
  discord: {
    announce: "1262178097684418593",
    report: "1260606647450079283",
    update: "1260597527133163610"
  },
  spplice: {
    address: "https://epochtal.p2r3.com/spplice",
    index: await epochtal.file.spplice.index.json()
  },
  // Epochtal Live
  lobbies: { list: {}, data: {} },
  events: {}
};

// Import dependencies for Discord integration
const Discord = require("discord.js");
const keys = require("../keys.js");

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
discordClient.login(keys.discord);
discordClient.once("ready", function () {
  discordClient.user.setActivity("Portal 2", { type: 5 });
});

// Import dependencies for filesystem usage
const fs = require("node:fs");
const path = require("node:path");

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

  if (userAgent && userAgent.includes("spplice/2") && !urlPath[0]) {
    return Response.json(await utils.spplice(["get"]));
  }

  // Handle WebSocket connections
  if (urlPath[0] === "ws") {

    // Make sure the user is logged in
    const user = await apis.users(["whoami"], req);
    if (!user) return Response("ERR_LOGIN", { status: 403 });

    // Decode the event from the URL
    const steamid = user.steamid;
    const event = decodeURIComponent(urlPath[1]);
    const eventData = epochtal.data.events[event];

    // Ensure event is valid and user has permission to access it
    if (!eventData) return Response("ERR_EVENT", { status: 404 });
    if (!(await eventData.auth(steamid))) return Response("ERR_PERMS", { status: 403 });

    // Upgrade the connection to a WebSocket
    if (server.upgrade(req, { data: { event, steamid } })) return;
    return new Response("ERR_PROTOCOL", { status: 500 });

  }

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
      } catch (e) { } // Leave it as a string
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
      } catch (e) { } // Leave it as a string
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
const server = Bun.serve({
  port: 8080,
  fetch: fetchHandler,
  websocket: {
    open: await utils.events(["wshandler", "open"]),
    message: await utils.events(["wshandler", "message"]),
    close: await utils.events(["wshandler", "close"])
  },
  tls: {
    key: Bun.file("/etc/letsencrypt/live/p2r3.com/privkey.pem"),
    cert: Bun.file("/etc/letsencrypt/live/p2r3.com/fullchain.pem")
  }
});
epochtal.data.events.server = server;

console.log(`Listening on http://localhost:${server.port}...`);

// Schedule routines
utils.routine(["schedule", "epochtal", "concludeWeek", "0 0 15 * * 7"]);
utils.routine(["schedule", "epochtal", "releaseMap", "0 0 12 * * 1"]);

// Register events
utils.events(["create", "utilError", steamid => epochtal.data.users[steamid].admin]);
utils.events(["create", "utilPrint", steamid => epochtal.data.users[steamid].admin]);
