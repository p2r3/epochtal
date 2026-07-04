const UtilError = require("./error.js");
const UtilPrint = require("./print.js");

const {CONFIG} = require("../config.ts");
const https = require("https");
const fs = require("node:fs");
const weights = require(`${CONFIG.DIR.SECRETS}/weights.js`);

const unzipper = require("unzipper");
const weeklog = require("./weeklog.js");
const archive = require("./archive.js");

// Normally we'd include workshopper.js, but that causes circular dependencies
// Duplicating code here is not ideal, but neither is restructuring the utils
// Besides, this has slightly less overhead, which is arguably important here
const STEAM_API = "https://api.steampowered.com";

// Mapping from lump name to lump index in BSP files
const LUMP_INDEX_FROM_NAME = {
  entities: 0, planes: 1, texdata: 2, vertexes: 3, visibility: 4,
  nodes: 5, texinfo: 6, faces: 7, lighting: 8, occlusion: 9,
  leafs: 10, faceids: 11, edges: 12, surfedges: 13, models: 14,
  worldlights: 15, leaffaces: 16, leafbrushes: 17, brushes: 18, brushsides: 19,
  areas: 20, areaportals: 21, portals: 22, clusters: 23, portalverts: 24,
  clusterportals: 25, dispinfo: 26, originalfaces: 27, physdisp: 28, physcollide: 29,
  vertnormals: 30, vertnormalindices: 31, disp_lightmap_alphas: 32, dispverts: 33, disp_lightmap_sample_positions: 34,
  game_lump: 35, leafwaterdata: 36, primitives: 37, primverts: 38, primindices: 39,
  pakfile: 40, clipportalverts: 41, cubemaps: 42, texdata_string_data: 43, texdata_string_table: 44,
  overlays: 45, leafmindisttowater: 46, face_macro_texture_info: 47, disp_tris: 48, physcollidesurface: 49,
  wateroverlays: 50, lightmappages: 51, lightmappageinfos: 52, lighting_hdr: 53, worldlights_hdr: 54,
  leaf_ambient_lighting_hdr: 55, leaf_ambient_lighting: 56, xzippakfile: 57, faces_hdr: 58, map_flags: 59,
  overlay_fades: 60
};

/**
 * Fetches the workshop data for a given map ID.
 *
 * @param {string} mapid The map ID to fetch data for
 * @return {json} The workshop data for the map
 */
async function getWorkshopData (mapid) {

  // Fetch the workshop data for the map
  const detailsRequest = await fetch(`${STEAM_API}/IPublishedFileService/GetDetails/v1/?key=${CONFIG.API_KEY.STEAM}&publishedfileids[0]=${mapid}&includeadditionalpreviews=true`);
  if (detailsRequest.status !== 200) return "ERR_STEAMAPI";

  // Parse the response, throwing an error if the data is invalid
  const detailsData = await detailsRequest.json();
  if (!("response" in detailsData && "publishedfiledetails" in detailsData.response)) {
    return "ERR_STEAMAPI";
  }
  const data = detailsData.response.publishedfiledetails[0];

  // Check if the response is valid
  if (data.result !== 1) return "ERR_MAPID";
  return data;

}

/**
 * Fetches the requested lumps for a given map, ignoring everything else in the BSP file.
 * Originally written by PancakeTAS, now generalized to download any requested lumps.
 * 
 * @param {string|object} data Map from which to fetch the BSP lumps
 * @param {number[]} lumpIndices BSP lump indices to download
 * @returns {Promise<string>} The requested BSP lumps for the map
 */
async function downloadBSPLumps (data, lumpIndices) {

  // Fetch the workshop data for the map
  if (typeof data !== "object") {
    data = await getWorkshopData(data);
    if (typeof data === "string") return data;
  }

  // Ensure the map is a Portal 2 map
  if (data.file_url === undefined) return "ERR_BADMAP";
  if (data.consumer_appid !== 620) return "ERR_BADMAP";

  // Fetch the BSP file for the map and extract the requested lumps
  return await (new Promise(function (resolve, _reject) {
    https.request(data.file_url, function (response) {

      if (response.statusCode !== 200) {
        resolve("ERR_STEAMAPI");
        return;
      }

      // ident, version, lumps[64] ( offset, length, version, cc ), map_revision
      const header_size = 4 + 4 + 64 * (4 + 4 + 4 + 4) + 4;

      const header = [];
      const lumpBuffers = {}; // An array of buffers for each lump
      let lumpRanges = null; // {offset, size} for each requested lump index
      let endOfLastLump = 0; // The byte index of the end of the last requested lump

      let bytes_read = 0;
      response.on("data", function (chunk) {

        const chunkStart = bytes_read;
        bytes_read += chunk.length;
        const chunkEnd = bytes_read;

        // If this chunk is, at least in part, in the header
        if (chunkStart < header_size) {
          header.push(chunk);

          // If the header just became fully read, grab offset and length for each requested
          // lump, and use them to compute the byte range of each requested lump
          if (chunkEnd >= header_size) {
            const buffer = Buffer.concat(header);
            lumpRanges = {};
            for (const i of lumpIndices) {
              const offset = buffer.readUInt32LE(4 + 4 + i * (4 + 4 + 4 + 4));
              const length = buffer.readUInt32LE(4 + 4 + i * (4 + 4 + 4 + 4) + 4);
              lumpRanges[i] = {
                start: offset,
                end: offset + length
              };
            }
            const endOfEachLump = lumpIndices.map((i) => lumpRanges[i].end);
            endOfLastLump = Math.max(...endOfEachLump);

            // For each requested lump, prepare an array to hold chunk slices
            for (const i of lumpIndices) lumpBuffers[i] = [];
          }
          // If we just read the last chunk of the header file, pass through to the next
          // section of code to see if part of this chunk included part of a requested lump
          // Otherwise, return
          else return;
        }

        // If this chunk is, at least in part, after the header
        if (chunkEnd > header_size) {
          // If we're here, the header is fully read, so we have already computed the byte
          // range for each requested lump

          // For each requested lump, store the portion of this chunk that overlaps that lump
          for (const i of lumpIndices) {
            const overlapStart = Math.max(chunkStart, lumpRanges[i].start);
            const overlapEnd = Math.min(chunkEnd, lumpRanges[i].end);
            if (overlapStart < overlapEnd) {
              const overlapOfChunkAndThisLump = chunk.subarray(overlapStart - chunkStart, overlapEnd - chunkStart);
              lumpBuffers[i].push(overlapOfChunkAndThisLump);
            }
          }
        }

        // If all lumps are fully read
        if (chunkEnd >= endOfLastLump) {

          // Concatenate each requested lump into a single buffer
          const result = {};
          for (const i of lumpIndices) result[i] = Buffer.concat(lumpBuffers[i]);

          // Resolve promise with requested lumps
          resolve(result);

          // Close connection early
          response.destroy();
        }
      });

      // If the response ended and we do not have all requested lumps, resolve with ERR_BADMAP
      response.on("end", function () {
        setTimeout(function () {
          resolve("ERR_BADMAP");
        }, 1000);
      });

    }).end();
  }))

}

/**
 * Parses the entities lump into an array of entities.
 *
 * @param {Buffer|string} input A BSP's entities lump buffer or string
 * @returns {object[]} Array of entities
 */
function parseEntitiesLump (input) {

  const keysWithStringValues = ["targetname", "classname", "model"];

  const inputString = input.toString();

  const entities = [];
  const entityStrings = inputString.replaceAll("\n}\n{\n", "}{").split("{");

  for (const segment of entityStrings) {

    if (!segment.trim()) continue;

    const entity = { outputs: {} };
    const keyvals = segment.split("\n");

    for (const keyval of keyvals) {

      const key = keyval.split('"')[1];
      const val = keyval.split('"')[3];
      if (key === undefined || val === undefined) continue;

      const lowerCaseKey = key.toLowerCase();

      if (val.includes("\x1B")) {
        if (!(lowerCaseKey in entity.outputs)) {
          entity.outputs[lowerCaseKey] = [];
        }
        entity.outputs[lowerCaseKey].push(val.split("\x1B"));
        continue;
      }

      if (keysWithStringValues.includes(lowerCaseKey))
        entity[lowerCaseKey] = val;
      else {
        const valArray = val.split(" ");
        if (valArray.length > 1) {
          entity[lowerCaseKey] = valArray.map(v => isNaN(v) ? v : Number(v));
        } else {
          entity[lowerCaseKey] = isNaN(val) ? val : Number(val);
        }
      }

    }

    entities.push(entity);

  }

  return entities;

}

/**
 * Parses the planes lump into an array of planes.
 * Each plane is 20 bytes (Source's dplane_t): normal (3 floats), dist (float), type (int).
 *
 * @param {Buffer} buffer A BSP's planes lump buffer
 * @returns {{ normal: { x: number, y: number, z: number }, dist: number, type: number }[]} Array of planes
 */
function parsePlanesLump (buffer) {

  const planes = [];
  for (let i = 0; i + 20 <= buffer.length; i += 20) {
    planes.push({
      normal: {
        x: buffer.readFloatLE(i),
        y: buffer.readFloatLE(i + 4),
        z: buffer.readFloatLE(i + 8)
      },
      dist: buffer.readFloatLE(i + 12),
      type: buffer.readInt32LE(i + 16)
    });
  }
  return planes;

}

/**
 * Parses the brushes lump into an array of brushes.
 * Each brush is 12 bytes (Source's dbrush_t): firstside (int), numsides (int), contents (int).
 *
 * @param {Buffer} buffer A BSP's brushes lump buffer
 * @returns {{ firstside: number, numsides: number, contents: number }[]} Array of brushes
 */
function parseBrushesLump (buffer) {

  const brushes = [];
  for (let i = 0; i + 12 <= buffer.length; i += 12) {
    brushes.push({
      firstside: buffer.readInt32LE(i),
      numsides: buffer.readInt32LE(i + 4),
      contents: buffer.readInt32LE(i + 8)
    });
  }
  return brushes;

}

/**
 * Parses the brushsides lump into an array of brush sides.
 * Each brushside is 8 bytes (Source's dbrushside_t): planenum (unsigned short), texinfo (short), dispinfo (short), bevel (byte), thin (byte).
 *
 * @param {Buffer} buffer A BSP's brushsides lump buffer
 * @returns {{ planenum: number, texinfo: number, dispinfo: number, bevel: number, thin: number }[]} Array of brush sides
 */
function parseBrushSidesLump (buffer) {

  const sides = [];
  for (let i = 0; i + 8 <= buffer.length; i += 8) {
    sides.push({
      planenum: buffer.readUInt16LE(i),
      texinfo: buffer.readInt16LE(i + 2),
      dispinfo: buffer.readInt16LE(i + 4),
      bevel: buffer.readUInt8(i + 6),
      thin: buffer.readUInt8(i + 7)
    });
  }
  return sides;

}

/**
 * Parses the pakfile lump by simply opening the ZIP archive.
 * Returns the zip object.
 * (If you want to decompress some individual files, call entry.buffer() on the corresponding entries of zip.files.)
 *
 * @param {Buffer} buffer A BSP's pakfile lump buffer
 * @returns {Promise<object|null>} Opened zip object, or null if buffer is empty or invalid
 */
async function parsePakfileLump (buffer) {

  if (buffer.length === 0) return null;
  try {
    return await unzipper.Open.buffer(buffer);
  } catch (_) {
    return null;
  }

}

// Parsers for BSP lumps
const LUMP_PARSERS = {
  entities: parseEntitiesLump,
  planes: parsePlanesLump,
  brushes: parseBrushesLump,
  brushsides: parseBrushSidesLump,
  pakfile: parsePakfileLump
};

/**
 * Fetches and parses the entities lump for a given map, ignoring everything else in the BSP file.
 *
 * @param {string|object} data Map from which to extract the entities
 * @returns {Promise<string>} The map's parsed entities lump or an error string
 */
async function extractEntities (data) {

  const indexOfEntitiesLump = LUMP_INDEX_FROM_NAME.entities;

  const result = await downloadBSPLumps(data, [indexOfEntitiesLump]);
  if (typeof result === "string") return result;

  const entitiesLump = result[indexOfEntitiesLump];

  return parseEntitiesLump(entitiesLump);

}

const VOLUME_BLOCK_SIZE = 2097152;

/**
 * Calculates the densities of objects in the map.
 *
 * @param {object} entities The entities in the map
 * @returns {object} The densities of objects in the map
 */
function calculateDensities (entities) {

  // To calculate the density of objects, we first need to find the test chamber
  // This is usually the "center of mass", or the object-densest point
  const centroid = [0, 0, 0];
  let considered = 0;
  for (const entity of entities) {

    if (!("model" in entity)) continue;
    if (!("origin" in entity)) continue;
    if (entity.model.startsWith("*")) continue;

    centroid[0] += entity.origin[0];
    centroid[1] += entity.origin[1];
    centroid[2] += entity.origin[2];

    considered ++;

  }

  centroid[0] /= considered;
  centroid[1] /= considered;
  centroid[2] /= considered;

  // Calculate distance of each entity from centroid
  for (const entity of entities) {
    if (!("origin" in entity)) continue;
    entity.distance = Math.sqrt( entity.origin.reduce((a, v, i) => (a + Math.pow(v - centroid[i], 2)), 0) );
  }

  // Find the median entity distance from the centroid
  // This is used to determine the size of the most populated map area
  entities.sort((a, b) => a.distance - b.distance);
  const median = entities[Math.floor(entities.length / 2)];
  const mapSize = median.distance * 1.5;
  // The volume of the map in 128x128x128 chunks (PeTI blocks)
  const mapSizeBlocks = Math.pow(mapSize, 3) / VOLUME_BLOCK_SIZE;

  // Count the amount of entities in the map, with separate counters for each entity type
  const counts = { total: 0 };
  for (const entity of entities) {

    if (!("model" in entity)) continue;
    if (!("origin" in entity)) continue;
    if (entity.model.startsWith("*")) continue;
    if (entity.classname === "prop_dynamic") continue;

    const isOutsideMap = entity.origin.find(function (c, i) {
      return Math.abs(c - centroid[i]) > mapSize;
    });
    if (isOutsideMap) continue;

    const name = entity.model || entity.classname;
    if (!name) continue;
    if (name.startsWith("*")) continue;

    if (!(name in counts)) counts[name] = 1;
    else counts[name] ++;

    // Keep track of the total density
    counts.total ++;

  }

  // Convert the above counts to object density
  const output = {};
  for (const name in counts) {
    output[name] = counts[name] / mapSizeBlocks;
  }

  return output;

}

/**
 * Handles the `curator` utility call. This utility is used to curate maps based on various criteria.
 *
 * The following subcommands are available:
 * - `v1`: The "original" Epochtal metadata curation algorithm
 * - `v2`: The "new" Repochtal object density curation algorithm
 * - `entities`: Returns an array of entities in the given workshop map
 * - `lumps`: Parses and returns the requested BSP lumps of the given workshop map
 *
 * The mapid is specified in `args[1]`.
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {unknown} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, mapid] = args;

  switch (command) {

    case "v1": {

      const authorcache = args[2] || {};

      // The "mapid" argument can also be an already pre-fetched Steam API response
      // This is so that we can bundle 100 maps together in one API call when curating for a week
      let data = mapid;
      if (typeof data !== "object") {
        data = await getWorkshopData(mapid);
        if (typeof data !== "object") {
          throw new UtilError(data, args, context);
        }
      }

      // Points are summed (never subtraced) to this counter based on various hardcoded criteria
      // The goal of this algorithm is to quantify the expertise of the author and how much effort they put into this map
      let points = 0;

      if ("previews" in data) {
        // Points for custom preview content
        points += weights.v1.PREVIEWS;
        if (data.previews.length > 2) points += weights.v1.PREVIEWS_EXTRA;

        // Points for custom preview video
        if (data.previews.find(c => c.preview_type === 1)) points += weights.v1.PREVIEWS_VIDEO;
      }

      const title = data.title.trim().toLowerCase();
      const description = data.file_description.replaceAll("\r", "").toLowerCase();
      const allText = title + description;

      // Tags aren't overused (PeTI and BEEmod maps often do this by default)
      if (data.tags.length < 10) points += weights.v1.TAGS_COUNT;

      // Custom visuals (sometimes indicative of genuine attention to detail)
      if (data.tags.find(elem => elem.tag === "Custom Visuals")) points += weights.v1.TAGS_VISUALS;

      // Map was published through Portal 2 Authoring Tools
      if (data.creator_appid === 644) points += weights.v1.HAMMER;

      // Custom filename - some maps are brought in from PeTI into Hammer, this might filter some of those out
      if (isNaN(data.filename.split("/").pop().split(".bsp")[0])) points += weights.v1.FILENAME;

      // Multi-line description
      if (description.includes("\n\n")) points += weights.v1.DESC_NEWLINE;
      // Custom description formatting
      if (description.includes("[/") && description.includes("]")) points += weights.v1.DESC_FORMATTING;

      // Map has had a revision (author cared enough to come back to it)
      if (data.time_created !== data.time_updated) points += weights.v1.REVISION;

      // Map doesn't focus on turrets (subjectively makes for a worse speedrunning experience)
      if (!allText.includes("turret")) points += weights.v1.TEXT_TURRETS;

      // Doesn't mention BEEmod - might indicate less overuse of BEEmod-specific elements
      if (!allText.includes("beemod") && !(/bee\d/.test(allText)) && !(/bee \d/.test(allText))) points += weights.v1.TEXT_BEEMOD;

      // Map isn't a chamber recreation - this is important, we want to have original routes
      if (!allText.includes("recreat") && !allText.includes("remake") && !allText.includes("portal 1")) points += weights.v1.TEXT_RECREATION;

      // Short title
      if (title.split(" ").length < 4) points += weights.v1.TITLE_LENGTH;
      // Title is capitalized properly
      if (title.toLowerCase() !== title && title.toUpperCase() !== title) points += weights.v1.TITLE_CASE;

      // Finally, some points are awarded based on the author's Portal 2 background and past works
      // These requests are heavy. If a cache is available, don't recalculate
      if (data.creator in authorcache) {
        points += authorcache[data.creator];
        return points;
      }

      // If we're here, there is no cache, so we should make one
      authorcache[data.creator] = 0;

      // Additional points for Portal 2 and Authoring Tools playtime
      // This tends to get rate-limited, so we try a maximum of 10 times with a linearly increasing delay
      let gamesList = 0;
      for (let tries = 0; tries <= 10; tries ++) {

        const response = await fetch(`${STEAM_API}/IPlayerService/GetOwnedGames/v1/?key=${CONFIG.API_KEY.STEAM}&steamid=${data.creator}`);

        if (response.status === 200) {
          gamesList = (await response.json()).response.games;
          break;
        }

        await new Promise(function (resolve) { setTimeout(resolve, tries * 500); });
        continue;

      }

      if (gamesList) {

        let gameHours = 0, editorHours = 0;
        for (const game of gamesList) {
          if (game.appid === 620) gameHours = game.playtime_forever / 60;
          else if (game.appid === 629) editorHours = game.playtime_forever / 60;
        }

        // This is calculated as the sum of a harmonic series to grant diminishing returns
        for (let i = 1; i <= gameHours / 150; i ++) authorcache[data.creator] += weights.v1.PLAYTIME_GAME / i;
        authorcache[data.creator] += (weights.v1.PLAYTIME_GAME * (gameHours % 150)) / (Math.floor(gameHours / 150 + 1) * 150);
        for (let i = 1; i <= editorHours / 150; i ++) authorcache[data.creator] += weights.v1.PLAYTIME_EDITOR / i;
        authorcache[data.creator] += (weights.v1.PLAYTIME_EDITOR * (editorHours % 150)) / (Math.floor(editorHours / 150 + 1) * 150);

      }

      // Additional points for user's workshop submission amount
      let userMaps;
      for (let tries = 0; tries <= 10; tries ++) {

        const response = await fetch(`${STEAM_API}/IPublishedFileService/GetUserFileCount/v1/?key=${CONFIG.API_KEY.STEAM}&steamid=${data.creator}&appid=620&totalonly=true`);

        if (response.status === 200) {
          userMaps = (await response.json()).response.total;
          break;
        }

        await new Promise(function (resolve) { setTimeout(resolve, tries * 500); });
        continue;

      }

      if (userMaps) {
        // Same harmonic series sum as before (with different weights, this is more valuable than play time)
        for (let i = 1; i <= userMaps / 30; i ++) authorcache[data.creator] += weights.v1.AUTHOR_WORKSHOP / i;
        authorcache[data.creator] += (weights.v1.AUTHOR_WORKSHOP * (userMaps % 30)) / (Math.floor(userMaps / 30 + 1) * 30);
      }

      points += authorcache[data.creator];
      return points;

    }

    case "v2": {

      // Whether to report density anomalies
      const report = args[2];

      // Convert entities lump to an object density graph
      const entities = await extractEntities(mapid);
      if (typeof entities === "string") throw new UtilError(entities, args, context);

      const density = calculateDensities(entities);

      // Fetch graphs against which to compare the map
      const graphs = await Bun.file(`${CONFIG.DIR.DATA}/entgraphs.json`).json();
      const maxNameCount = Object.keys(graphs).length;

      // Calculate curation score by checking map entities against precomputed graphs
      let score = 0, totalDensityScore = 0;

      for (const ent in density) {

        if (!(ent in graphs)) continue;
        const { scores, bounds } = graphs[ent];

        // Density values have to be normalized to the graph bounds
        const { high, low } = bounds;
        const range = high - low;
        let norm = range === 0 ? 1 : (density[ent] - low) / range;

        // If the density is outside of the acceptable range, punish severely
        if (norm < -0.25 || norm > 1.25) {

          if (report) UtilPrint(`Density of "${ent}" is outside of acceptable range. (${norm})`);

          if (ent === "total") {
            totalDensityScore = -weights.v2.QUALITY_DEFAULT;
          } else {
            score -= Math.pow(Math.abs(weights.v2.QUALITY_PUNISH * norm), weights.v2.SCORE_EXPONENT);
          }

          delete graphs[ent];
          continue;

        } else {
          // If it's within an acceptable range, clamp its normalized value to [0; 1]
          norm = Math.max(Math.min(norm, 1), 0);
        }

        let normInt = Math.floor(norm * weights.v2.GROUPING_DEPTH);
        if (normInt !== weights.v2.GROUPING_DEPTH) normInt += 1;

        // If the density is within bounds, assign the corresponding score
        if (ent === "total") {
          totalDensityScore = scores[normInt];
        } else {
          score += Math.pow(scores[normInt], weights.v2.SCORE_EXPONENT);
        }

        // Remove entities that we've found
        // This later lets us check what we haven't encountered (i.e. densities of 0)
        delete graphs[ent];

      }

      // Assign points for entities that weren't encountered
      for (const ent in graphs) {
        score += Math.pow(graphs[ent].scores[0], weights.v2.SCORE_EXPONENT);
      }

      const scoreAverage = score / maxNameCount;
      const finalScoreRoot = Math.pow(Math.abs(score / maxNameCount), 1 / weights.v2.SCORE_EXPONENT) * (scoreAverage < 0 ? -1 : 1);

      return (finalScoreRoot * 2 + totalDensityScore) / 3;

    }

    case "entities": {

      // Download and parse the entities lump of the map's BSP
      const entitiesLump = await extractEntities(mapid);
      if (typeof entitiesLump === "string") throw new UtilError(entitiesLump, args, context);

      return entitiesLump;

    }

    case "lumps": {

      // If only one lump was requested and it was not given in an array, put it in an array
      // Also, lowercase all given lump names
      const names = (Array.isArray(args[2]) ? args[2] : [args[2]]).map(s => s.toLowerCase());

      // Convert the requested lump names to lump indices of a BSP
      const lumpIndices = [];
      for (const name of names) {
        const lumpIndex = LUMP_INDEX_FROM_NAME[name];
        if (lumpIndex === undefined) throw new UtilError(`Unknown lump: ${name}`, args, context);
        lumpIndices.push(lumpIndex);
      }

      // Download the requested lumps of the map's BSP
      const result = await downloadBSPLumps(mapid, lumpIndices);
      if (typeof result === "string") throw new UtilError(result, args, context);

      // Parse each extracted lump and format a data structure to return using the lump names
      const output = {};
      for (const name of names) {
        const lumpIndex = LUMP_INDEX_FROM_NAME[name];
        const buffer = result[lumpIndex];
        const parser = LUMP_PARSERS[name];
        output[name] = parser ? await parser(buffer) : buffer;
      }
      return output;

    }

    case "graph": {

      const archiveList = (await archive(["list"], context)).reverse();
      const output = {}, density = {}, scores = [], bounds = {};

      for (const archiveName of archiveList) {

        // Don't treat duplicates
        if (archiveName.includes("_")) continue;

        const archiveContext = await archive(["get", archiveName], context);
        const weekNumber = archiveContext.data.week.number;

        // Start with week 19, not enough participation data before that
        if (weekNumber < 19) continue;
        // This was an April fools map, treat it as an outlier
        if (weekNumber == 53) continue;
        // Competitiveness and density are out of this world, textbook outlier
        if (weekNumber === 95) continue;

        const mainCategory = archiveContext.data.week.categories.find(curr => curr.name === "main");
        const mainLeaderboard = archiveContext.data.leaderboard.main;
        const isCoop = mainCategory.coop || (mainLeaderboard && mainLeaderboard[0] && mainLeaderboard[0].partner);

        // Weeks without a "main" category have no competitiveness
        if (!mainCategory || !mainLeaderboard) continue;
        // Only judge single-player maps
        if (isCoop) continue;

        const currLog = await weeklog(["read"], archiveContext);

        let submissions = 0;
        const players = [];
        for (let i = 0; i < currLog.length; i ++) {
          if (currLog[i].category !== "main") continue;
          if (!players.includes(currLog[i].steamid)) players.push(currLog[i].steamid);
          submissions ++;
        }

        let mapDensity;
        const densityCachePath = `${CONFIG.DIR.DATA}/archives/${archiveName}/entdensity.json`;

        // Check the archive directory for a potential entity density cache
        if (fs.existsSync(densityCachePath)) {
          mapDensity = await Bun.file(densityCachePath).json();
        } else {
          // If a cache was not found, try to download the BSP and calculate graphs
          const entities = await extractEntities(archiveContext.data.week.map.id);
          if (typeof entities === "string") continue; // If we failed, too bad

          mapDensity = calculateDensities(entities);

          await Bun.write(densityCachePath, JSON.stringify(mapDensity));
        }

        // The above code gets the density of each entity type in the current map
        // This loop adds those values to the "density" table containing data for all maps
        for (const name in mapDensity) {

          if (!(name in density)) {
            density[name] = Array(scores.length).fill(null);
          } else if (density[name].length < scores.length) {
            const delta = scores.length - density[name].length;
            density[name].push(...(Array(delta).fill(null)));
          }

          density[name].push(mapDensity[name]);

        }

        // Competitiveness is a measure of submissions to "main" per player
        const competitiveness = submissions / players.length;
        scores.push(competitiveness);

      }

      // The "output" begins as a table of arrays, with entity models/classes as keys
      // Array indexes are normalized object densities (with 0 denoting no objects)
      // Values are used for averaging each index's competitiveness later
      for (const name in density) {

        // Leave space for index 0 to denote the complete abscence of an entity
        output[name] = new Array(weights.v2.GROUPING_DEPTH + 1);
        output[name][0] = { score: weights.v2.QUALITY_DEFAULT, count: 1 };

        const arr = density[name];
        const valuesOnly = arr.filter(c => c !== null);
        valuesOnly.sort((a, b) => a - b);

        // Determine IQR and bounds for outlier removal
        const Q1 = valuesOnly[Math.floor(valuesOnly.length * (1 / 4))];
        const Q3 = valuesOnly[Math.floor(valuesOnly.length * (3 / 4))];
        const IQR = Q3 - Q1;
        const lowerBound = Q1 - 1.5 * IQR;
        const upperBound = Q3 + 1.5 * IQR;
        const valuesFiltered = valuesOnly.filter(x => x >= lowerBound && x <= upperBound);

        // Find data range for normalization
        const low = Math.min(...valuesFiltered);
        const high = Math.max(...valuesFiltered);
        const range = high - low;

        bounds[name] = { low, high };

        // Apply scores for each map
        for (let i = 0; i < arr.length; i ++) {

          if (arr[i] === null) {
            output[name][0].score += scores[i];
            output[name][0].count ++;
            continue;
          }
          if (arr[i] < lowerBound || arr[i] > upperBound) continue;

          const norm = range === 0 ? 1 : (arr[i] - low) / range;
          let normInt = Math.floor(norm * weights.v2.GROUPING_DEPTH);
          if (normInt !== weights.v2.GROUPING_DEPTH) normInt += 1;

          if (output[name][normInt] === undefined) {
            output[name][normInt] = { score: weights.v2.QUALITY_DEFAULT, count: 1 };
          }

          output[name][normInt].score += scores[i];
          output[name][normInt].count ++;

        }

      }

      // Calculate average of competitiveness scores
      for (const name in output) {
        const arr = output[name];
        for (let j = 0; j < arr.length; j ++) {
          if (arr[j] === undefined) continue;
          arr[j] = arr[j].score / arr[j].count;
        }
      }

      // Linearly interpolate remaining gaps
      for (const name in output) {

        for (let j = 0; j < output[name].length; j ++) {
          if (output[name][j] !== undefined) continue;

          let end;
          for (end = j; output[name][end] === undefined; end ++);

          const from = output[name][j - 1];
          const to = output[name][end];
          const steps = end - j;

          for (let k = j; k < end; k ++) {
            output[name][k] = from + (to - from) / steps * (j - k + 1);
          }
        }

        // Fill any gaps that might not have been filled with weights.v2.QUALITY_DEFAULT
        for (let j = 0; j < output[name].length; j ++) {
          if (!isNaN(output[name][j])) continue;
          output[name][j] = weights.v2.QUALITY_DEFAULT;
        }

      }

      const centeredMovingAverage = function (data, windowSize) {

        // Do not average with the first entry, as that's density with 0 entities (a special case)
        const result = [data[0]];
        data = data.slice(1);

        const halfWindow = Math.floor(windowSize / 2);

        for (let i = 0; i < data.length; i++) {
          let sum = 0;
          let count = 0;

          for (let j = -halfWindow; j <= halfWindow; j++) {
            if (i + j >= 0 && i + j < data.length) {
              sum += data[i + j];
              count++;
            }
          }

          result.push(sum / count);
        }

        return result;

      };

      for (const name in output) {
        output[name] = {
          scores: centeredMovingAverage(output[name], 5),
          bounds: bounds[name]
        };
      }

      Bun.write(`${CONFIG.DIR.DATA}/entgraphs.json`, JSON.stringify(output));
      return output;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
