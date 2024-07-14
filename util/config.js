const UtilError = require("./error.js");

/**
 * Handles the `config` utility call. This utility can do the following based on the (sub)command that gets called:
 *
 * - `get`: Gets the specified configuration value.
 * - `edit`: Edits the specified configuration value.
 * - `fixdate`: ???
 *
 * @param args Arguments for the utility call
 * @param context The context on which to execute the call
 * @returns {Promise<unknown>} The result of the utility call
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

      // TODO: what does this do?

      const today = new Date();

      let mapReleaseDate = new Date(today.getTime() - (today.getDay() + 6) % 7 * 24 * 60 * 60 * 1000);
      mapReleaseDate.setUTCHours(12, 0, 0, 0);
      mapReleaseDate = Math.floor(mapReleaseDate.getTime() / 1000);

      week.date = mapReleaseDate;
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
