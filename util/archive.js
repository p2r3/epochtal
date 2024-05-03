const UtilError = require("./error.js");

const fs = require("node:fs");
const { $ } = require("bun");

async function getArchiveContext (path) {

  const context = { file: {}, data: {} };
  
  context.file = {
    leaderboard: Bun.file(`${path}/leaderboard.json`),
    users: epochtal.file.users,
    week: Bun.file(`${path}/week.json`),
    log: `${path}/week.log`
  };

  context.data = {
    leaderboard: await context.file.leaderboard.json(),
    users: epochtal.data.users,
    week: await context.file.week.json()
  };

  return context;

}

module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  switch (command) {

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

    case "list": {

      return fs.readdirSync(`${__dirname}/../pages/archive`);
      
    }
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
