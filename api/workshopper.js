const workshopper = require("../util/workshopper.js");
const curator = require("../util/curator.js");
const api_users = require("./users.js");
const {CONFIG} = require("../config.ts");

/**
 * Handles `/api/workshopper/` endpoint requests. This endpoint supports only the `suggest` command:
 *
 * - `suggest`: Suggest a map for the workshop.
 * - `random`: Returns the SteamID of a random Workshop map.
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {string} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, mapid] = args;

  // Fetch the list of suggestions
  const file = Bun.file(`${CONFIG.DIR.DATA}/suggestions.json`);
  const maps = await file.json();

  const randomMapSources = await Bun.file(`${__dirname}/../data/random-sources.json`).json();

  switch (command) {

    case "suggest": {

      // Get the active user and throw ERR_LOGIN if not logged in
      const user = await api_users(["whoami"], request);
      if (!user) return "ERR_LOGIN";

      // Verify mapid and check if it has already been suggested
      if (!mapid || isNaN(mapid)) return "ERR_MAPID";
      if (maps.find(c => c.id === mapid)) return "ERR_EXISTS";

      // Curate the map
      const v1 = await curator(["v1", mapid]);
      const v2 = await curator(["v2", mapid]);

      // Add the map to the suggestions list
      maps.push({ v1, v2, id: mapid });
      Bun.write(file, JSON.stringify(maps));

      return "SUCCESS";

    }

    case "random": {
      const source = args[1];
      const map = await workshopper(["random"]);

      if (source) {
        if (!(source in randomMapSources)) {
          randomMapSources[source] = [null, null];
        } else {
          randomMapSources[source][0] = randomMapSources[source][1];
          randomMapSources[source][1] = map;
        }
        await Bun.write(`${__dirname}/../data/random-sources.json`, JSON.stringify(randomMapSources));
      }

      return map;
    }

    case "randomsource": {
      const source = args[1];
      return randomMapSources[source];
    }

  }

  return "ERR_COMMAND";

};
