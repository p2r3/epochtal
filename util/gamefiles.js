const UtilError = require("./error.js");

const fs = require("node:fs");
const crc = require("crc");
const { $ } = require("bun");

const tmppath = require("./tmppath.js");
const workshopper = require("./workshopper.js");
const coopifier = require("./coopifier.js");

/**
 * Generates a checksum from the contents of a file.
 *
 * @param {string} path The path to the file
 * @returns {string} The checksum of the file
 */
async function getChecksum (path) {

  // Load file and generate checksum
  const file = await Bun.file(path).arrayBuffer();
  let checksum = crc.crc32(file).toString(16).toUpperCase();

  // Pad with zeroes
  while (checksum.length < 8) {
    checksum = "0" + checksum;
  }

  return checksum;

}

/**
 * Grab SAR from the p2sr/SourceAutoRecord GitHub repository.
 *
 * @returns {object[]} An array of objects containing the name, output path, and checksum of the downloaded SAR files
 */
async function getSAR () {

  // Parse returned assets for linux and windows
  const latest = (await (await fetch("https://api.github.com/repos/p2sr/SourceAutoRecord/releases")).json())[0];
  const output = [];

  for (let i = 0; i < latest.assets.length; i ++) {

    // Check for sar.dll and sar.so
    const asset = latest.assets[i];
    if (asset.name !== "sar.dll" && asset.name !== "sar.so") continue;

    const request = await fetch(asset.browser_download_url);
    if (request.status !== 200) throw "ERR_GITHUBAPI";

    const currPath = await tmppath();

    // Causes a memory leak
    // await Bun.write(currPath, request);

    // Download SAR to tmp path
    await $`wget ${asset.browser_download_url} -O ${currPath}`.quiet();

    // Generate checksum for SAR and add to output
    output.push({
      name: asset.name,
      output: currPath,
      crc32: await getChecksum(currPath)
    });

  }

  return output;

}

/**
 * Grab a map from the Steam Workshop.
 *
 * @param {Number} mapid The ID of the map to download
 * @returns {object} An object containing the output path, workshop ID, and BSP name of
 */
async function getMap (mapid) {

  // Get map data from workshopper
  const data = await workshopper(["get", mapid, true]);

  const workshop = data.file_url.startsWith("http") ? data.file_url.split("/ugc/")[1].split("/")[0] : data.file_url.split("/")[0];
  const bsp = data.filename.split("/").pop().slice(0, -4); // Just the file name, no extension

  // Download map to tmp path
  const output = (await tmppath()) + ".bsp";

  const request = await fetch(data.file_url);
  if (request.status !== 200) throw "ERR_STEAMAPI";

  // Causes a memory leak
  // await Bun.write(output, request);

  await $`wget ${data.file_url} -O ${output}`.quiet();
  return { output, workshop, bsp };

}

/**
 * Build the game files for the current week.
 *
 * @param {object} context The context
 * @returns {object} An object containing the output path and map path(s)
 */
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
  const mapPaths = [];
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
  // Write current week number to epochtal_week.cfg as an svar
  await Bun.write(`${portal2}/cfg/epochtal_week.cfg`, `svar_set epochtal_week ${week.number}`);
  // Write the server's address to allow for API access from Spplice JS interface
  await Bun.write(`${portal2}/address.txt`, `${gconfig.https ? "https" : "http"}://${gconfig.domain}`);

  // Create checksums for all created files if checksum list output paths exist
  if (context.file.mdp) {

    let checksums = "\n// Epochtal files";

    const files = fs.readdirSync(portal2, { recursive: true });
    const checkExtensions = ["nut", "vpk", "cfg"];

    for (let i = 0; i < files.length; i ++) {

      const file = files[i];
      if (!fs.lstatSync(`${portal2}/${file}`).isFile()) continue;

      const extension = file.split(".").pop();
      if (!(checkExtensions.find(c => c === extension))) continue;

      const checksum = await getChecksum(`${portal2}/${file}`);
      checksums += `\n/portal2_tempcontent/${file} ${checksum}`;

    }

    // Write additional checksums to MDP whitelist
    const filesum = await Bun.file(`./defaults/filesum_whitelist.txt`).text();
    await Bun.write(context.file.mdp.filesums, filesum + checksums);

    // Write SAR checksums to MDP whitelist
    let sarsums = "";
    for (let i = 0; i < sar.length; i ++) sarsums += sar[i].crc32 + "\n";
    await Bun.write(context.file.mdp.sarsums, sarsums);

  }

  // Prepare map(s) BSP for simulated co-op
  for (let i = 0; i < mapPaths.length; i ++) {
    await coopifier(["inject", `${portal2}/maps/${mapPaths[i]}.bsp`], context);
  }

  return {
    map: mapPaths, // Return map path for further use in verification
    output: portal2
  };

}

/**
 * Decompiles a map to a VMF file.
 *
 * @param {*} path Path to the BSP file
 * @param {*} compress Whether to compress the VMF file
 * @returns {string} Path to the decompiled VMF file
 */
async function getVMF (path, compress = false) {

  if (path.endsWith(".bsp")) path = path.slice(0, -4);

  const output = (await tmppath()) + ".vmf" + (compress ? ".xz" : "");

  // Decompile map
  const flags = "--no_cubemaps --no_areaportals --no_occluders --no_ladders --no_visgroups --no_cams";
  await $`${gconfig.bindir}/bspsrc/bspsrc.sh ${flags} ${path}.bsp`.quiet();

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

/**
 * Handles the `gamefiles` utility call. This utility is used to manage user game files.
 *
 * The following subcommands are available:
 * - `build`: Build the game files for the current week
 * - `getsar`: Grab SAR from the p2sr/SourceAutoRecord GitHub repository
 * - `getmap`: Grab a map from the Steam Workshop
 * - `getvmf`: Decompile a map to a VMF file
 *
 * @param {string[]} args The arguments for the utility call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|object[]|string} The output of the utility call
 */
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
