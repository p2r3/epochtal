const UtilError = require("./error.js");

const curator = require("./curator.js");
const keys = require("../../keys.js");

const STEAM_API = "https://api.steampowered.com";

async function getData (mapid, raw) {

  const detailsRequest = await fetch(`${STEAM_API}/IPublishedFileService/GetDetails/v1/?key=${keys.steam}&publishedfileids[0]=${mapid}&includeadditionalpreviews=true`);
  if (detailsRequest.status !== 200) return "ERR_STEAMAPI";

  const detailsData = await detailsRequest.json();
  if (!("response" in detailsData && "publishedfiledetails" in detailsData.response)) return "ERR_STEAMAPI";
  const details = detailsData.response.publishedfiledetails[0];
  
  if (details.result !== 1) return "ERR_MAPID";

  if (raw) return details;

  const authorRequest = await fetch(`${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${keys.steam}&steamids=${details.creator}`);
  if (authorRequest.status !== 200) return "ERR_STEAMAPI";

  const authorData = await authorRequest.json();
  if (!("response" in authorData && "players" in authorData.response)) return "ERR_STEAMAPI";
  const author = authorData.response.players[0];

  let screenshot = details.preview_url;

  if ("previews" in details) {
    const preview = details.previews.find(curr => curr.preview_type === 0);
    if (preview) screenshot = preview.url;
  }

  return {
    id: mapid,
    title: details.title,
    author: author.personaname,
    thumbnail: details.preview_url.split("https://steamuserimages-a.akamaihd.net/ugc/")[1] || details.preview_url,
    screenshot: screenshot.split("https://steamuserimages-a.akamaihd.net/ugc/")[1] || screenshot
  };

}

async function curateWorkshop (maps = []) {

  // Super long workshop API query requesting pretty much everything you can
  const requestData = `${STEAM_API}/IPublishedFileService/QueryFiles/v1/?key=${keys.steam}&query_type=1&numperpage=100&appid=620&requiredtags=Singleplayer&match_all_tags=true&filetype=0&return_vote_data=false&return_tags=true&return_kv_tags=true&return_previews=true&return_children=true&return_short_description=false&return_for_sale_data=false&return_metadata=true&return_playtime_stats=false`;
  
  // const weekSeconds = 604800; // one week
  const weekSeconds = 86400; // one day
  const startDate = Date.now() / 1000;

  const authorcache = {};
  let page = 1, lastDate = startDate;

  while (startDate - lastDate < weekSeconds) {

    const request = await fetch(`${requestData}&page=${page}`);
    const response = (await (await fetch(`${requestData}&page=${page++}`)).json()).response;
    const results = response.publishedfiledetails;

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

module.exports = async function (args, context = epochtal) {

  const [command, mapid] = args;

  switch (command) {

    case "get": {

      if (!mapid) throw new UtilError("ERR_MAPID", args, context);
      const raw = args[2];

      const output = await getData(mapid, raw);
      if (typeof output === "string") {
        throw new UtilError(output, args, context);
      }

      return output;

    }

    case "curateweek": {

      const maps = args[1];
      if (maps && !Array.isArray(maps)) {
        throw new UtilError("ERR_ARGS", args, context);
      }

      // Ensure that v2 density graphs are up to date
      await curator(["graph"], context);

      return await curateWorkshop(maps);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
