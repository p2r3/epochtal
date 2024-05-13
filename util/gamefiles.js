const UtilError = require("./error.js");

const fs = require("node:fs");
const crc = require("crc");
const { $ } = require("bun");

const keys = require("../../keys.js");
const tmppath = require("./tmppath.js");
const workshopper = require("./workshopper.js");
const coopify = require("./coopify.js");

async function getChecksum (path) {

  const file = await Bun.file(path).arrayBuffer();
  let checksum = crc.crc32(file).toString(16).toUpperCase();

  while (checksum.length < 8) {
    checksum = "0" + checksum;
  }

  return checksum;

}

async function getSAR () {

  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": "Bearer " + keys.github,
    "User-Agent": "p2r3",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  const request = await fetch("https://api.github.com/repos/p2sr/SourceAutoRecord/releases", { headers: headers });
  if (request.status !== 200) throw "ERR_GITHUBAPI";

  const latest = (await request.json())[0];
  const output = [];

  for (let i = 0; i < latest.assets.length; i ++) {

    const asset = latest.assets[i];
    if (asset.name !== "sar.dll" && asset.name !== "sar.so") continue;

    const request = await fetch(asset.browser_download_url, { headers: headers });
    if (request.status !== 200) throw "ERR_GITHUBAPI";

    const currPath = await tmppath();

    // Causes a memory leak
    // await Bun.write(currPath, request);
    
    await $`wget ${asset.browser_download_url} -O ${currPath}`.quiet();

    output.push({
      name: asset.name,
      output: currPath,
      crc32: await getChecksum(currPath)
    });

  }

  return output;

}

async function getMap (mapid) {

  const data = await workshopper(["get", mapid, true]);

  const workshop = data.file_url.startsWith("http") ? data.file_url.split("/ugc/")[1].split("/")[0] : data.file_url.split("/")[0];
  const bsp = data.filename.split("/").pop().slice(0, -4); // Just the file name, no extension

  const output = (await tmppath()) + ".bsp";

  const request = await fetch(data.file_url);
  if (request.status !== 200) throw "ERR_STEAMAPI";

  // Causes a memory leak
  // await Bun.write(output, request);
  
  await $`wget ${data.file_url} -O ${output}`.quiet();
  return { output, workshop, bsp };

}

async function buildFiles (context) {

  const week = context.data.week;

  const portal2 = await tmppath();
  const defaults = context.file.portal2;

  // Prepare directory for game files
  fs.mkdirSync(`${portal2}`);
  fs.mkdirSync(`${portal2}/scripts`);
  fs.mkdirSync(`${portal2}/scripts/vscripts`);
  fs.mkdirSync(`${portal2}/cfg`);
  fs.mkdirSync(`${portal2}/maps`);
  fs.mkdirSync(`${portal2}/maps/workshop`);

  // Download workshop map(s)
  let mapPaths = [];
  if (!Array.isArray(week.map)) {

    const map = await getMap(week.map.id);
    mapPaths[0] = `workshop/${map.workshop}/${map.bsp}`;
  
    fs.mkdirSync(`${portal2}/maps/workshop/${map.workshop}`);
    fs.renameSync(map.output, `${portal2}/maps/${mapPaths[0]}.bsp`);

  } else {

    for (let i = 0; i < week.map.length; i ++) {

      const map = await getMap(week.map[i].id);
      mapPaths.push(`workshop/${map.workshop}/${map.bsp}`);

      fs.mkdirSync(`${portal2}/maps/workshop/${map.workshop}`);
      fs.renameSync(map.output, `${portal2}/maps/${mapPaths[i]}.bsp`);

    }

  }

  // Download SAR
  const sar = await getSAR();

  for (let i = 0; i < sar.length; i ++) {
    sar[i].name = "epochtal_" + sar[i].name;
    fs.renameSync(sar[i].output, `${portal2}/${sar[i].name}`);
  }

  // Copy all game file "defaults" to output path
  fs.cpSync(defaults, portal2, { recursive: true });
  // Write map command and script to epochtal_map
  await Bun.write(`${portal2}/cfg/epochtal_map.cfg`, `map ${mapPaths[0]}`);
  await Bun.write(`${portal2}/scripts/vscripts/epochtal_map.nut`, `::epochtal_map <- ["${mapPaths.join('", "')}"]`);

  // Create checksums for all created files
  let checksums = "\n// Epochtal files";

  const files = fs.readdirSync(portal2, { recursive: true });
  const checkExtensions = ["nut", "vpk", "cfg"];

  for (let i = 0; i < files.length; i ++) {

    const file = files[i];
    if (!fs.lstatSync(`${portal2}/${file}`).isFile()) continue;
    
    const extension = file.split(".").pop();
    if (!(checkExtensions.find(c => c === extension))) continue;

    const checksum = await getChecksum(`${portal2}/${file}`);
    checksums += `\n./portal2_tempcontent/${file} ${checksum}`;

  }

  // Write additional checksums to MDP whitelist
  const filesum = await Bun.file(`./defaults/filesum_whitelist.txt`).text();
  await Bun.write(`${__dirname}/../bin/mdp-json/filesum_whitelist.txt`, filesum + checksums);

  // Write SAR checksums to MDP whitelist
  let sarsums = "";
  for (let i = 0; i < sar.length; i ++) sarsums += sar[i].crc32 + "\n";
  await Bun.write(`${__dirname}/../bin/mdp-json/sar_whitelist.txt`, sarsums);

  // Prepare map(s) BSP for simulated co-op
  for (let i = 0; i < mapPaths.length; i ++) {
    if ((await coopify([`${portal2}/maps/${mapPaths[i]}.bsp`])) !== true) throw "ERR_COOPIFY";
  }

  return {
    map: mapPaths, // Return map path for further use in verification
    output: portal2
  };

}

async function getVMF (path, compress = false) {

  if (path.endsWith(".bsp")) path = path.slice(0, -4);

  const output = (await tmppath()) + ".vmf" + (compress ? ".xz" : "");

  // Decompile map
  const flags = "--no_cubemaps --no_areaportals --no_occluders --no_ladders --no_visgroups --no_cams";
  await $`${__dirname}/../bin/bspsrc/bspsrc.sh ${flags} ${path}.bsp`.quiet();

  // Compress decompiled VMF
  if (compress) {
    await $`xz -z9e ${`${path}_d.vmf`}`.quiet();
    fs.renameSync(`${path}_d.vmf.xz`, output);
  } else {
    fs.renameSync(`${path}_d.vmf`, output);
  }

  // Remove excess logs
  fs.unlinkSync(`${path}_d.log`);

  return output;

}

module.exports = async function (args, context = epochtal) {

  const [command] = args;

  switch (command) {

    case "build": {

      let output;
      try {
        output = await buildFiles(context);
      } catch (e) {
        if (typeof e !== "string") throw e;
        throw new UtilError(e, args, context);
      }
      return output;

    }

    case "getsar": {

      let output;
      try {
        output = await getSAR();
      } catch (e) {
        if (typeof e !== "string") throw e;
        throw new UtilError(e, args, context);
      }
      return output;

    }

    case "getmap": {

      const mapid = args[1];
      if (!mapid) throw new UtilError("ERR_MAPID", args, context);

      let output;
      try {
        output = await getMap(mapid);
      } catch (e) {
        if (typeof e !== "string") throw e;
        throw new UtilError(e, args, context);
      }
      return output;

    }

    case "getvmf": {

      const [path, compress] = args.slice(1);
      if (!path) throw new UtilError("ERR_PATH", args, context);

      let output;
      try {
        output = await getVMF(path, compress);
      } catch (e) {
        if (typeof e !== "string") throw e;
        throw new UtilError(e, args, context);
      }
      return output;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
