const UtilError = require("./error.js");

const curator = require("./curator.js");

const STEAM_API = "https://api.steampowered.com";

/**
 * Fetches map data from the Steam Workshop API.
 *
 * @param {string} mapid The map ID to fetch
 * @param {boolean} raw Whether to return the raw data
 * @returns {object|string} The map data or an error string
 */
async function getData (mapid, raw) {

  // Fetch the map details
  const detailsRequest = await fetch(`${STEAM_API}/IPublishedFileService/GetDetails/v1/?key=${process.env.STEAM_API_KEY}&publishedfileids[0]=${mapid}&includeadditionalpreviews=true`);
  if (detailsRequest.status !== 200) return "ERR_STEAMAPI";

  // Ensure the response is valid
  const detailsData = await detailsRequest.json();
  if (!("response" in detailsData && "publishedfiledetails" in detailsData.response)) return "ERR_STEAMAPI";

  const details = detailsData.response.publishedfiledetails[0];
  if (details.result !== 1) return "ERR_MAPID";

  // Return the raw data if requested
  if (raw) return details;

  // Fetch the author details
  const authorRequest = await fetch(`${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${details.creator}`);
  if (authorRequest.status !== 200) return "ERR_STEAMAPI";

  // Ensure the response is valid
  const authorData = await authorRequest.json();
  if (!("response" in authorData && "players" in authorData.response)) return "ERR_STEAMAPI";

  // Build the output object
  const author = authorData.response.players[0];
  let screenshot = details.preview_url;

  if ("previews" in details) {
    const preview = details.previews.find(curr => curr.preview_type === 0);
    if (preview) screenshot = preview.url;
  }

  // Extract components of the path to which the map is saved when subscribed to
  const pathWorkshop = details.file_url.split("/ugc/").pop().split("/")[0];
  const pathBSP = details.filename.split("/").pop().slice(0, -4);

  return {
    id: mapid,
    title: details.title,
    author: author.personaname,
    thumbnail: details.preview_url.split("https://steamuserimages-a.akamaihd.net/ugc/")[1] || details.preview_url,
    screenshot: screenshot.split("https://steamuserimages-a.akamaihd.net/ugc/")[1] || screenshot,
    file: `workshop/${pathWorkshop}/${pathBSP}`
  };

}

/**
 * Curates the workshop for the past week.
 *
 * @param {Array} maps Maps array to append to
 * @returns {Array} Curated maps array
 */
async function curateWorkshop (maps = []) {

  // Super long workshop API query requesting pretty much everything you can
  const requestData = `${STEAM_API}/IPublishedFileService/QueryFiles/v1/?key=${process.env.STEAM_API_KEY}&query_type=1&numperpage=100&appid=620&requiredtags=Singleplayer&match_all_tags=true&filetype=0&return_vote_data=false&return_tags=true&return_kv_tags=true&return_previews=true&return_children=true&return_short_description=false&return_for_sale_data=false&return_metadata=true&return_playtime_stats=false`;

  const weekSeconds = 604800; // one week
  const startDate = Date.now() / 1000;

  const authorcache = {};
  let page = 1, lastDate = startDate;

  // Ensure we're not going back more than a week
  while (startDate - lastDate < weekSeconds) {

    // Fetch page of workshop data
    const response = (await (await fetch(`${requestData}&page=${page++}`)).json()).response;
    const results = response.publishedfiledetails;

    // Curate each result
    for (const data of results) {

      if (startDate - data.time_created >= weekSeconds) break;

      try {

        // Files over 128MiB are too big to be worth considering
        if (Number(data.file_size) > 134217728) continue;

        // Make sure we're not picking a co-op map
        if (data.tags.find(c => c.tag === "Cooperative")) continue;

        maps.push({
          id: data.publishedfileid,
          v1: await curator(["v1", data, authorcache]),
          v2: await curator(["v2", data.publishedfileid])
        });

      } catch (err) {
        // If an individual map failed to be curated, too bad. Plenty of fish in the sea.
        console.error(`Curation error:`, err);
      }

    }

    lastDate = results[results.length - 1].time_created;
    page ++;

  }

  // Filter outliers in v2 output scores (but only for finding normalization bounds!!)
  // This lets us scale common values against v1 properly, while keeping outliers at the extremes
  // For example, if v2 is confident that a map is -50 points, we should let that overrule v1
  // In normal cases however, v1 is a lot more trustworthy, so that's weighted way higher

  // Sorted v2 output values
  const v2arr = maps.map(c => c.v2).sort((a, b) => a - b);
  // First and third quartile values
  const Q1 = v2arr[Math.floor(v2arr.length * (1 / 4))];
  const Q3 = v2arr[Math.floor(v2arr.length * (3 / 4))];
  // Interquartile Range and bounds
  const IQR = Q3 - Q1;
  const lowerBound = Q1 - 1.5 * IQR;
  const upperBound = Q3 + 1.5 * IQR;
  // Find minimum and maximum values within these bounds
  const v2arrFiltered = v2arr.filter(c => c >= lowerBound && c <= upperBound);
  const v2min = Math.min(...v2arrFiltered);
  const v2max = Math.max(...v2arrFiltered);
  const v2range = v2max - v2min;

  // Sum up the points from both algorithms
  // Here 2.5 is chosen as an arbitrary constant that seems to scale well as a guide to v1
  for (const map of maps) {
    map.v2 = (map.v2 - v2min) / v2range * 2.5;
    map.points = map.v1 + map.v2;
  }

  // Sort the maps array in descending order of total points
  maps.sort(function (a, b) {
    return b.points - a.points;
  });

  return maps;

}

// Contains a tree structure for buckets of random maps
const randomMapCache = {
  created: 0,
  map: null
};

/**
 * Rebuilds the random map total count cache tree.
 *
 * This is a binary tree, where each node represents the total amount of
 * maps published to the workshop in a given timespan. The tree generates
 * until a child node has less than 50'000 total maps, which is the upper
 * workshop API query limit.
 */
async function rebuildRandomMapCache (node = null) {

  if (!node) {
    // Start iteration with global tree cache
    node = randomMapCache;
    // Store cache creation date for expiry checks later
    randomMapCache.created = Date.now();
    // Use date range between PTI release and today
    node.start = Math.floor(new Date("2012-05-08").getTime() / 1000);
    node.end = Math.floor(new Date().getTime() / 1000);
  }

  // Calculate midpoint of this node's date range
  const half = Math.floor((node.start + node.end) / 2);

  // Create branches for this node containing timestamp ranges
  node.left = {
    start: node.start,
    end: half
  };
  node.right = {
    start: half,
    end: node.end
  };

  // Set up base parameters for querying map totals
  const baseParams = {
    query_type: 1,
    appid: 620,
    requiredtags: ["Singleplayer"],
    excludedtags: ["Cooperative"],
    totalonly: true
  };
  const baseQuery = `${STEAM_API}/IPublishedFileService/QueryFiles/v1/?key=${process.env.STEAM_API_KEY}`;

  // Set up parameters for the left and right branches
  const leftParams = structuredClone(baseParams);
  leftParams.date_range_created = {
    timestamp_start: node.start,
    timestamp_end: half
  };
  const rightParams = structuredClone(baseParams);
  rightParams.date_range_created = {
    timestamp_start: half,
    timestamp_end: node.end
  };

  // Fetch totals for both the left and right branches in parallel
  const [leftData, rightData] = await Promise.all([
    fetch(`${baseQuery}&input_json=${encodeURIComponent(JSON.stringify(leftParams))}`).then(res => res.json()),
    fetch(`${baseQuery}&input_json=${encodeURIComponent(JSON.stringify(rightParams))}`).then(res => res.json())
  ]);

  // Assign totals to each of the branch nodes
  node.left.total = leftData.response.total;
  node.right.total = leftData.response.total;
  // If necessary, assign a total for this node too
  if (!("total" in node)) node.total = node.left.total + node.right.total;

  // Recursively (and asynchronously) generate caches for the rest of the tree
  const remaining = [];
  if (node.left.total > 50000) remaining.push(rebuildRandomMapCache(node.left));
  if (node.right.total > 50000) remaining.push(rebuildRandomMapCache(node.right));
  await Promise.all(remaining);

}

// Automatically schedules a cache rebuild once it expires
async function autoRebuildRandomMapCache () {
  // If the cache has expired, rebuild it
  const cacheAge = Date.now() - randomMapCache.created;
  if (cacheAge > 86400000) {
    await rebuildRandomMapCache();
  }
  // Schedule a rebuild for a minute after the cache expires
  const untilExpiry = Math.max(0, 86400000 - cacheAge);
  setTimeout(autoRebuildRandomMapCache, untilExpiry + 60000);
}
autoRebuildRandomMapCache();

// Fetches a truly random singleplayer map from the Steam workshop
async function fetchRandomMap (node = null) {

  // Start the recursion with the top of the cached tree
  if (!node) {
    // Rebuild bucket cache tree if it has expired
    if (Date.now() - randomMapCache.created > 86400000) {
      await rebuildRandomMapCache();
    }
    node = randomMapCache;
  }

  // If no maps found in this node, reroll the entire selection
  if (node.total === 0) return await fetchRandomMap(null);

  // If the map count in this node is within the query limit, pick a map
  if (node.total <= 50000) {

    // Query for exactly one random map in this node's time range
    const queryParams = {
      query_type: 1,
      appid: 620,
      requiredtags: ["Singleplayer"],
      excludedtags: ["Cooperative"],
      numperpage: 1,
      page: Math.floor(Math.random() * node.total) + 1,
      return_details: true,
      date_range_created: {
        timestamp_start: node.start,
        timestamp_end: node.end
      }
    };
    const baseQuery = `${STEAM_API}/IPublishedFileService/QueryFiles/v1/?key=${process.env.STEAM_API_KEY}&input_json=${encodeURIComponent(JSON.stringify(queryParams))}`;
    const { response } = await (await fetch(baseQuery)).json();
    // Some queries don't return anything, reroll
    if (!("publishedfiledetails" in response)) return await fetchRandomMap(null);
    const data = response.publishedfiledetails[0];

    // If we've picked a deleted map, reroll
    if (data.result !== 1) return await fetchRandomMap(null);

    // Some maps can't be downloaded, reroll
    const fileFetch = await fetch(data.file_url);
    if (fileFetch.status !== 200) return await fetchRandomMap(null);

    // Reject PTI maps with an unconnected and closed exit door
    // If the map wasn't published with PTI, this check doesn't apply
    if (data.creator_appid !== 620) return data;

    // Download the map's entity lump and extract an array of entities
    const entities = await curator(["entities", data]);
    // If there's no standard exit proxy, this check doesn't apply
    if (!entities.find(e => e.targetname === "doorexit2-proxy")) return data;
    // If the exit door is open by default, this check doesn't apply
    if (!entities.find(e => e.targetname === "doorexit2-branch_toggle" && e.initialvalue == 0)) return data;

    // Start by assuming that the exit is disconnected, then try to disprove that
    let exitConnected = false;
    // Iterate over all map entities, looking for their outputs
    for (const entity of entities) {
      if (!("outputs" in entity)) continue;
      if (typeof entity.outputs !== "object") continue;
      // Look for outputs that mention the exit door proxy
      for (const output in entity.outputs) {
        if (entity.outputs[output].find(c => c[0] === "doorexit2-proxy")) {
          exitConnected = true;
          break;
        }
      }
      if (exitConnected) break;
    }
    // If no exit door connection was found, reroll
    if (!exitConnected) return await fetchRandomMap(null);

    return data;

  }

  // If a branch node is missing its map total, assume incomplete cache
  if (!("total" in node.left)) return "ERR_CACHE";

  // Pick the left or right branch of the tree with a weighted probability
  if (Math.random() < node.left.total / node.total) {
    return await fetchRandomMap(node.left);
  } else {
    return await fetchRandomMap(node.right);
  }

}

/**
 * Handles the `workshopper` utility call. This utility is used to interact and curate the Steam Workshop.
 *
 * The following subcommands are available:
 * - `get`: Fetch map data from the Steam Workshop API
 * - `curateweek`: Curate the workshop for the past week
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, mapid] = args;

  switch (command) {

    case "get": {

      // Ensure the mapid is valid
      if (!mapid || isNaN(mapid)) throw new UtilError("ERR_MAPID", args, context);
      const raw = args[2];

      // Fetch the map data
      const output = await getData(mapid, raw);
      if (typeof output === "string") {
        throw new UtilError(output, args, context);
      }

      return output;

    }

    case "curateweek": {

      // Ensure specified maps array is valid
      const maps = args[1];
      if (maps && !Array.isArray(maps)) {
        throw new UtilError("ERR_ARGS", args, context);
      }

      // Curate the workshop for the past week
      return await curateWorkshop(maps);

    }

    case "random": {

      // Save the precached query result and clear it
      const cachedMap = randomMapCache.map;
      const cacheAge = Date.now() - randomMapCache.created;
      randomMapCache.map = null;

      // Cache a result for the next query
      fetchRandomMap().then(result => {
        // Leave cache blank in case of an error
        if (typeof result === "string") return;
        randomMapCache.map = result;
      }).catch(e => {});

      // Return the previously cached result if it is valid
      if (cachedMap && cacheAge < 86400000) {
        return cachedMap;
      }

      // Otherwise, perform the query on the spot
      const output = await fetchRandomMap();
      if (typeof output === "string") {
        throw new UtilError(output, args, context);
      }
      return output;

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
