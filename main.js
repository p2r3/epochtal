// This is to skip waiting for file I/O everywhere else later on.
global.epochtal = { file: {}, data: {}, name: "epochtal" };
epochtal.file = {
  leaderboard: Bun.file(`${__dirname}/pages/leaderboard.json`),
  users: Bun.file(`${__dirname}/pages/users.json`),
  profiles: `${__dirname}/pages/profiles`,
  week: Bun.file(`${__dirname}/pages/week.json`),
  log: `${__dirname}/pages/week.log`,
  portal2: `${__dirname}/defaults/portal2`,
  demos: `${__dirname}/demos`,
  spplice: {
    repository: `${__dirname}/pages/spplice`,
    index: Bun.file(`${__dirname}/pages/spplice/index.json`)
  }
};
epochtal.data = {
  leaderboard: await epochtal.file.leaderboard.json(),
  users: await epochtal.file.users.json(),
  profiles: {},
  week: await epochtal.file.week.json(),
  discord: {
    announce: "1260596922419380246",
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

const Discord = require("discord.js");
const keys = require("../keys.js");

// We don't want to set up the client more than once
global.discordClient = new Discord.Client({
  partials: ["CHANNEL"],
  intents: 1 + 512 // Guilds, guild messages
});

discordClient.login(keys.discord);
discordClient.once("ready", function () {
  discordClient.user.setActivity("Portal 2", { type: 5 });
});

const fs = require("node:fs");
const path = require("node:path");

const utilsdir = fs.readdirSync("./util");
const utils = {};
utilsdir.forEach(util => {
  util = util.split(".js")[0];
  utils[util] = require("./util/" + util);
});

const apisdir = fs.readdirSync("./api");
const apis = {};
apisdir.forEach(api => {
  api = api.split(".js")[0];
  apis[api] = require("./api/" + api);
});

const UtilError = utils["error"];

const profilesdir = fs.readdirSync(epochtal.file.profiles);
profilesdir.forEach(steamid => {
  const dataPath = `${epochtal.file.profiles}/${steamid}/data.json`;
  epochtal.data.profiles[steamid] = require(dataPath);
});

const fetchHandler = async function (req) {

  const url = new URL(req.url);
  const urlPath = url.pathname.split("/").slice(1);
  const userAgent = req.headers.get("User-Agent");

  if (userAgent && userAgent.includes("spplice/2") && !urlPath[0]) {
    return Response.json(await utils.spplice(["get"]));
  }

  if (urlPath[0] === "ws") {

    const user = await apis.users(["whoami"], req);
    if (!user) return Response("ERR_LOGIN", { status: 403 });

    const steamid = user.steamid;
    const event = decodeURIComponent(urlPath[1]);
    const eventData = epochtal.data.events[event];

    if (!eventData) return Response("ERR_EVENT", { status: 404 });
    if (!(await eventData.auth(steamid))) return Response("ERR_PERMS", { status: 403 });

    if (server.upgrade(req, { data: { event, steamid } })) return;
    return new Response("ERR_PROTOCOL", { status: 500 });

  }

  if (urlPath[0] === "api") {

    const api = apis[urlPath[1]];
    const args = urlPath.slice(2).map(decodeURIComponent);

    for (let i = 0; i < args.length; i ++) {
      try {
        args[i] = JSON.parse(args[i]);
      } catch (e) { } // Leave it as a string
    }

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

    if (output instanceof Response) return output;
    return Response.json(output);

  }

  if (urlPath[0] === "util" || urlPath[0] === "admin") {

    const user = await apis.users(["whoami"], req);
    if (!user) return Response("ERR_LOGIN", { status: 403 });
    if (!user.epochtal.admin) return Response("ERR_PERMS", { status: 403 });

  }

  if (urlPath[0] === "util") {

    const util = utils[urlPath[1]];
    const args = urlPath.slice(2).map(decodeURIComponent);

    if (!util) return Response("ERR_UTIL", { status: 404 });

    for (let i = 0; i < args.length; i ++) {
      try {
        args[i] = JSON.parse(args[i]);
      } catch (e) { } // Leave it as a string
    }

    let result;
    try {
      result = await util(args);
    } catch (err) {
      if (!(err instanceof UtilError)) {
        err = new UtilError("ERR_UNKNOWN: " + err.message, args, epochtal, urlPath[1], err.stack);
      }
      return Response.json(err.toString());
    }

    return Response.json(result);

  }

  const file404 = Bun.file(`${__dirname}/pages/404.html`);

  let pathDecoded = decodeURIComponent(url.pathname.split("#")[0]);
  if (pathDecoded.endsWith("/")) pathDecoded += "index.html";

  // Detects probable path traversal attempts, better safe than sorry
  if (path.normalize(pathDecoded) !== pathDecoded) {
    return Response(file404, { status: 404 });
  }

  let outputFilePath = "pages" + pathDecoded;

  if (!fs.existsSync(outputFilePath)) {
    return Response(file404, { status: 404 });
  }
  if (fs.lstatSync(outputFilePath).isDirectory()) {
    outputFilePath += "/index.html";
  }

  const file = Bun.file(outputFilePath);

  if (file.size === 0) {
    return Response(file404, { status: 404 });
  }

  return Response(file);

};

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

utils.routine(["schedule", "epochtal", "concludeWeek", "0 0 15 * * 7"]);
utils.routine(["schedule", "epochtal", "releaseMap", "0 0 12 * * 1"]);

utils.events(["create", "utilError", steamid => epochtal.data.users[steamid].admin]);
utils.events(["create", "utilPrint", steamid => epochtal.data.users[steamid].admin]);
