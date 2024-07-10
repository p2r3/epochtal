const UtilError = require("./error.js");
const UtilPrint = require("../util/print.js");

const fs = require("node:fs");
const proof = require("./proof.js");

function isValidName (name) {
  return name && !name.includes("..") && !name.includes("/");
}

async function getArchiveContext (name) {

  if (!isValidName(name)) return "ERR_NAME";

  const path = `${__dirname}/../pages/archive/${name}`;
  if (!fs.existsSync(path)) return "ERR_NAME";

  const context = { file: {}, data: {} };
  
  context.file = {
    leaderboard: Bun.file(`${path}/leaderboard.json`),
    users: epochtal.file.users,
    profiles: epochtal.file.profiles,
    week: Bun.file(`${path}/week.json`),
    log: `${path}/week.log`,
    demos: `${path}/demos`
  };

  context.data = {
    leaderboard: await context.file.leaderboard.json(),
    users: epochtal.data.users,
    profiles: epochtal.data.profiles,
    week: await context.file.week.json()
  };

  context.name = `archive_week${context.data.week.number}`;

  for (const category in context.data.leaderboard) {
    for (const run of context.data.leaderboard[category]) {

      run.proof = await proof(["type", run.steamid, category], context);

    }
  }

  return context;

}

module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  switch (command) {

    case "list": {

      const getWeekNumber = function (str) {
        let match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      };

      const list = fs.readdirSync(`${__dirname}/../pages/archive`);
      list.sort(function (a, b) {
        return getWeekNumber(b) - getWeekNumber(a);
      });
      return list;

    }

    case "get": {

      const archiveContext = await getArchiveContext(name);
      if (typeof archiveContext === "string") {
        throw new UtilError(archiveContext, args, context);
      }

      return archiveContext;

    }

    case "assume": {

      const archiveContext = await getArchiveContext(name);
      if (typeof archiveContext === "string") {
        throw new UtilError(archiveContext, args, context);
      }

      const utilName = args[2];
      const utilArgs = args.slice(3);

      if (!utilName || utilName.includes("..") || utilName.includes("/")) throw new UtilError("ERR_ARGS", args, context);
      if (!fs.existsSync(`${__dirname}/${utilName}.js`)) throw new UtilError("ERR_UTIL", args, context);
      
      // This will fail if circular dependencies with archive.js are encountered...
      const util = require(`${__dirname}/${utilName}.js`);
      return await util(utilArgs, archiveContext);

    }

    case "create": {

      if (name && !isValidName(name)) throw new UtilError("ERR_NAME", args, context);
      
      let archivePath = `${__dirname}/../pages/archive/${name || ("week" + context.data.week.number)}`;
      const force = !!args[2];

      if (force && fs.existsSync(archivePath)) {
        const originalPath = archivePath;
        for (let i = 1; i < 32; i ++) {
          archivePath = originalPath + "_" + i;
          if (!fs.existsSync(archivePath)) break;
        }
        if (archivePath !== originalPath) {
          UtilPrint(`Warning: Forcing archive creation under new path "${archivePath}"`, context);
        }
      }
      
      if (fs.existsSync(archivePath)) {
        throw new UtilError("ERR_EXISTS", args, context);
      }
      fs.mkdirSync(archivePath);

      await Bun.write(`${archivePath}/leaderboard.json`, context.file.leaderboard);
      await Bun.write(`${archivePath}/week.json`, context.file.week);
      await Bun.write(`${archivePath}/week.log`, Bun.file(context.file.log));

      const mapmodPath = `${context.file.portal2}/scripts/vscripts/epochtalmapmod.nut`;
      if (fs.existsSync(mapmodPath)) {
        await Bun.write(`${archivePath}/epochtalmapmod.nut`, Bun.file(mapmodPath));
      }

      fs.mkdirSync(`${archivePath}/demos`);

      const files = fs.readdirSync(context.file.demos);
      for (let i = 0; i < files.length; i ++) {
        fs.renameSync(`${context.file.demos}/${files[i]}`, `${archivePath}/demos/${files[i]}`);
      }

      return "SUCCESS";

    }
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
