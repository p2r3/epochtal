const UtilError = require("./error.js");

const fs = require("node:fs");
const { $ } = require("bun");

async function getArchiveContext (path) {

  const context = { file: {}, data: {} };
  
  context.file = {
    leaderboard: Bun.file(`${path}/leaderboard.json`),
    users: epochtal.file.users,
    week: Bun.file(`${path}/week.json`),
    log: `${path}/week.log`,
    demos: `${path}/demos`
  };

  context.data = {
    leaderboard: await context.file.leaderboard.json(),
    users: epochtal.data.users,
    week: await context.file.week.json()
  };

  for (const category in context.data.leaderboard) {
    for (const run of context.data.leaderboard[category]) {

      const demoPath = `${path}/demos/${run.steamid}_${category}.dem.xz`;
      const linkPath = `${path}/demos/${run.steamid}_${category}.link`;
  
      if (fs.existsSync(demoPath)) {
        run.proof = "demo";
        continue;
      }
      if (fs.existsSync(linkPath)) {
        run.proof = "video";
        continue;
      }

      run.proof = null;

    }
  }

  return context;

}

module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  if (command !== "list" && (!name || name.includes("..") || name.includes("/"))) {
    throw new UtilError("ERR_NAME", args, context);
  }

  switch (command) {

    case "list": {

      return fs.readdirSync(`${__dirname}/../pages/archive`);
      
    }

    case "get": {

      const archivePath = `${__dirname}/../pages/archive/${name}`;
      if (!fs.existsSync(archivePath)) throw new UtilError("ERR_NAME", args, context);

      return await getArchiveContext(archivePath);

    }

    case "assume": {

      const archivePath = `${__dirname}/../pages/archive/${name}`;
      if (!fs.existsSync(archivePath)) throw new UtilError("ERR_NAME", args, context);

      const archiveContext = await getArchiveContext(archivePath);

      let util;
      try {
        util = require("./" + args[2]);
        if (!util) throw new UtilError("ERR_UTIL", args, context);
      } catch (e) {
        throw new UtilError("ERR_UTIL", args, context);
      }

      const args = args.slice(3);

      return await util(args, archiveContext);

    }

    case "create": {

      const archivePath = `${__dirname}/../pages/archive/${name || ("week" + context.data.week.number)}`;

      if (fs.existsSync(archivePath)) throw new UtilError("ERR_EXISTS", args, context);
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

    case "demo": {

      const [steamid, category] = args.slice(2);
      if (!steamid || !category) throw new UtilError("ERR_ARGS", args, context);

      const archivePath = `${__dirname}/../pages/archive/${name}`;
      if (!fs.existsSync(archivePath)) throw new UtilError("ERR_NAME", args, context);

      const demoPath = `${archivePath}/demos/${steamid}_${category}.dem.xz`;
      const linkPath = `${archivePath}/demos/${steamid}_${category}.link`;

      if (fs.existsSync(demoPath)) return Bun.file(demoPath);
      if (fs.existsSync(linkPath)) return Bun.file(linkPath);

      throw new UtilError("ERR_NOTFOUND", args, context);

    }
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
