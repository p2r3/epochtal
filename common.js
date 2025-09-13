const {CONFIG} = require("./config.js");

const STEAM_API = "https://api.steampowered.com";

/**
 * Fetches the workshop data for a given map ID.
 *
 * @param {string} mapid The map ID to fetch data for.
 * @return {json} The workshop data for the map.
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
 * Prevents special characters from changing formatting of a Discord message
 *
 * @author Misheus
 * @param {string}string text to sanitize
 * @returns {string} sanitized text
 */
function sanitizeForDiscord (string) {
  // Prepend a backslash to all reserved Discord characters
  return string.replaceAll(/[*@_~`#[\]()\-.>\\:]/g, "\\$&")
    // Due to bug in discord backslashing @everyone and @here still results in a ping. To fix this,
    // add a Zero-Width Space between @ and everyone or here.
    .replaceAll("@everyone", "@​everyone")
    .replaceAll("@here", "@​here");
}

module.exports = { getWorkshopData, sanitizeForDiscord, STEAM_API };
