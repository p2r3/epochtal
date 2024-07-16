const UtilError = require("./error.js");

/**
 * Handles the `config` utility call. This utility is used to interact with the configuration of the current week.
 *
 * The following subcommands are available:
 * - `get`: Get the in `args[1]` specified configuration value.
 * - `edit`: Edit the in `args[1]` specified configuration value to `args[2]`.
 * - `fixdate`: Set the `data.week.date` field of the given context to be the first day of the current week at 12:00 UTC.
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {unknown|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, field] = args;

  // Grab the week data and file
  const file = context.file.week;
  const week = context.data.week;

  switch (command) {

    case "get": {

      if (!field) return week;
      if (!(field in week)) throw new UtilError("ERR_FIELD", args, context);
      return week[field];

    }

    case "edit": {

      const value = args[2];
      if (!(field in week)) throw new UtilError("ERR_FIELD", args, context);
      if (value === undefined) throw new UtilError("ERR_VALUE", args, context);

      // Update the configuration value
      week[field] = value;

      // Write the updated week data to the file
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

    case "fixdate": {

      const today = new Date();

      // Get the first day of the current week at 12:00 UTC
      let mapReleaseDate = new Date(today.getTime() - (today.getDay() + 6) % 7 * 24 * 60 * 60 * 1000);
      mapReleaseDate.setUTCHours(12, 0, 0, 0);

      // Convert date object to a UNIX timestamp by removing milliseconds
      mapReleaseDate = Math.floor(mapReleaseDate.getTime() / 1000);

      // Write the correct date to file
      week.date = mapReleaseDate;
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
