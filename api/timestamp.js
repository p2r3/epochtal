/**
 * Handles `/api/timestamp/` endpoint requests. This endpoint supports only the `get` command:
 *
 * - `get`: Fetch the server time in milliseconds from January 1, 1970, UTC
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {object} The response of the api request
 */
module.exports = async function (args, request) {

  const [command] = args;

  switch (command) {

    case "get": {

      return Date.now();

    }

  }

  return "ERR_COMMAND";

};
