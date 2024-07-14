const UtilError = require("./error.js");

/**
 * Handles the `categories` utility call. This utility can do the following based on the (sub)command that gets called:
 *
 * - `list`: Lists all categories.
 * - `getall`: Gets all category data.
 * - `get`: Gets the category data of the specified category.
 * - `remove`: Removes the specified category.
 * - `add`: Adds a new category.
 * - `edit`: Edits the specified category.
 *
 * @param args The arguments for the call
 * @param context The context on which to execute the call
 * @returns {unknown} The result of the utility call
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