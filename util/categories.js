const UtilError = require("./error.js");

/**
 * Handles the `categories` utility call. This utility is used to manage categories for the week.
 *
 * The following subcommands are available:
 * - `list`: List all categories.
 * - `getall`: Get all category data.
 * - `get`: Get the category data of the category specified in `args[1]`.
 * - `remove`: Remove the in `args[1]` specified category.
 * - `add`: Add a new category named `args[1]`.
 * - `edit`: Edit the in `args[1]` specified category to `args[2]`.
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string[]|object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  // Grab the week data and file
  const file = context.file.week;
  const week = context.data.week;

  switch (command) {

    case "list": {

      // Return an array of category names
      const output = [];

      for (let i = 0; i < week.categories.length; i ++) {
        output.push(week.categories[i].name);
      }

      return output;

    }

    case "getall": {

      return week.categories;

    }

    case "get": {

      // Find the category index by name
      const index = week.categories.findIndex(curr => curr.name === name);
      if (index === -1) throw new UtilError("ERR_CATEGORY", args, context);

      // Return appropriate category data
      return week.categories[index];

    }

    case "remove": {

      // Find the category index by name
      const index = week.categories.findIndex(curr => curr.name === name);
      if (index === -1) throw new UtilError("ERR_CATEGORY", args, context);

      // Remove the category
      week.categories.splice(index, 1);
      // Write the changes to the file
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

    case "add": {

      // Ensure all required arguments are present
      for (let i = 2; i <= 7; i ++) {
        if (args[i] === undefined) throw new UtilError("ERR_ARGS", args, context);
      }

      const [title, portals, coop, lock, proof, points, slot] = args.slice(2);

      const newCategory = { name, title, portals, coop, lock, proof, points };

      // Add the category to a specific slot or at the end
      if (slot === undefined) {
        week.categories.push(newCategory);
      } else {
        week.categories.splice(slot, 0, newCategory);
      }

      // Write the changes to the file
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

    case "edit": {

      // Find the category index by name
      const index = week.categories.findIndex(curr => curr.name === name);
      if (index === -1) throw new UtilError("ERR_CATEGORY", args, context);

      // Ensure all required arguments are present
      const key = args[2];
      let value = args[3];

      if (key === undefined || value === undefined) {
        throw new UtilError("ERR_ARGS", args, context);
      }

      // Parse value argument
      if (value === "true") value = true;
      else if (value === "false") value = false;

      // Edit the category data
      week.categories[index][key] = value;

      // Write the changes to the file
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};