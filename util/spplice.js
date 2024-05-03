const UtilError = require("./error.js");

const fs = require("node:fs");
const { $ } = require("bun");
const tmppath = require("./tmppath.js");

async function archiveFiles (portal2) {

  const output = (await tmppath()) + ".tar.xz";
  await $`tar -cJf ${output} -C ${portal2} .`;

  return output;

}

async function buildManifest (packages, context) {
  
  if (!packages) {
 
    const week = context.data.week;

    let thumbnail = week.map.thumbnail;
    if (!thumbnail.startsWith("http")) thumbnail = `https://steamuserimages-a.akamaihd.net/ugc/${thumbnail}?impolicy=Letterbox&imh=360`;

    packages = [{
      title: "Tournament Week " + week.number,
      name: "epochtal",
      author: "PortalRunner",
      file: "http://epochtal.p2r3.com:3002/epochtal.tar.xz",
      icon: thumbnail,
      description: `With a community vote of ${week.map.upvotes} upvotes to ${week.map.downvotes} downvotes, the map for week ${week.number} of PortalRunner's Weekly Tournament was decided to be ${week.map.title} by ${week.map.author}.`,
      weight: 100
    }];
  
  }

  const output = (await tmppath()) + ".json";
  await Bun.write(output, JSON.stringify({ packages }));

  return output;

}

async function buildPackage (portal2, manifest) {

  const path = await tmppath();
  fs.mkdirSync(path);

  const archive = await archiveFiles(portal2);

  fs.renameSync(archive, `${path}/${manifest.name}.tar.xz`);
  await Bun.write(path + "/manifest.json", JSON.stringify(manifest));

  const output = (await tmppath()) + ".sppkg";
  await $`tar -cf ${output} -C ${path} .`;

  fs.rmSync(path, { recursive: true });

  return output;

}

module.exports = async function (args, context = epochtal) {

  const [command] = args;

  switch (command) {

    case "archive": {

      const portal2 = args[1];
      if (!portal2) throw new UtilError("ERR_GAMEFILES", args, context);

      return await archiveFiles(portal2);

    }
    
    case "package": {

      const [portal2, manifest] = args.slice(1);
      if (!portal2 || !fs.existsSync(portal2)) throw new UtilError("ERR_GAMEFILES", args, context);
      if (!manifest) throw new UtilError("ERR_MANIFEST", args, context);

      return await buildPackage(portal2, manifest);

    }

    case "manifest": {

      const packages = args[1];

      return await buildManifest(packages, context);

    }
    
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
