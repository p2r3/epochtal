/**
 * Handles `/api/config/` endpoint requests. This endpoint supports only the `get` command:
 *
 * - `get`: Fetch the current week configuration
 *
 * @param args The arguments for the api request
 * @param request The http request object
 * @returns {unknown} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, category] = args;

  const week = epochtal.data.week;

  switch (command) {

    case "get": {

      return {
        number: week.number,
        date: week.date,
        voting: week.voting,
        bonus: week.bonus,
        votingmaps: week.votingmaps,
        map: week.map,
        categories: week.categories,
        partners: week.partners
      };

    }

  }

  return "ERR_COMMAND";

};
