const UtilError = require("./error.js");

const fs = require("node:fs");
const { $ } = require("bun");
const tmppath = require("./tmppath.js");

/**
 * Creates a tar.xz archive of the files in the given directory
 *
 * @param {string} portal2 Path to the directory
 * @returns {Promise<string>} Path to the archive
 */
async function archiveFiles (portal2) {

  const output = (await tmppath()) + ".tar.xz";
  await $`XZ_OPT=-9e tar -cJf ${output} -C ${portal2} .`;

  return output;

}

/**
 * Handles the `spplice` utility call. This utility is used to manage everything spplice-related.
 *
 * The following subcommands are available:
 * - `get`: Get the index or a specific package
 * - `add`: Add a package to the index
 * - `remove`: Remove a package from the index
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {object|string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  const file = context.file.spplice.index;
  const index = context.data.spplice.index;

  const repository = context.file.spplice.repository;
  const address = context.data.spplice.address;

  switch (command) {

    case "get": {

      // Get spplice index
      if (!name) return index;

      // Find specific package
      const curr = index.packages.find(c => c.name === name);
      if (curr) return curr;
      return null;

    }

    case "add": {

      // Ensure all required arguments are present
      for (let i = 1; i <= 6; i ++) if (!args[i]) throw new UtilError("ERR_ARGS", args, context);

      const [portal2, title, author, icon, description, weight] = args.slice(2);

      if (!("packages" in index)) {
        index.packages = [];
      }

      // Validate all arguments
      if (!fs.existsSync(portal2) || !fs.lstatSync(portal2).isDirectory()) {
        throw new UtilError("ERR_GAMEFILES", args, context);
      }

      if (name.includes("..") || name.includes("/")) {
        throw new UtilError("ERR_NAME", args, context);
      }

      // Download icon if url is provided
      let iconLink, iconPath;
      if (icon.startsWith("http://") || icon.startsWith("https://")) {

        const response = await fetch(icon);
        const mime = response.headers.get("Content-Type");

        if (!mime.startsWith("image/")) throw new UtilError("ERR_ICON", args, context);

        const extension = mime.split("/")[1].split("+")[0];
        const filename = `${name}.${extension}`;
        iconPath = `${repository}/${filename}`;

        // Download icon and save it to the repository
        await $`wget ${icon} -O ${iconPath}`.quiet();
        iconLink = `${address}/${filename}`;

      } else {

        // Ensure provided icon is a file
        if (!fs.existsSync(icon)) throw new UtilError("ERR_ICON", args, context);

        const extension = icon.split(".").pop();
        const filename = `${name}.${extension}`;
        iconPath = `${repository}/${filename}`;

        // Copy icon to the repository
        fs.copyFileSync(icon, iconPath);
        iconLink = `${address}/${filename}`;

      }

      // Archive the files and save them to the repository
      let archiveLink;
      try {
        const archivedFilesPath = await archiveFiles(portal2);
        fs.renameSync(archivedFilesPath, `${repository}/${name}.tar.xz`);
        archiveLink = `${address}/${name}.tar.xz`;
      } catch (err) {
        fs.unlinkSync(iconPath);
        throw new UtilError("ERR_ARCHIVE: " + err.message, args, context, "spplice", err.stack);
      }

      // Add the package to the index
      index.packages.push({
        title,
        name,
        author,
        description,
        icon: iconLink,
        file: archiveLink,
        weight: weight || 100,
        // Ensures Spplice 3 cache is invalidated on every change
        version: Date.now().toString(),
        args: []
      });

      // Save the index to the file if it exists
      if (file) Bun.write(file, JSON.stringify(index));

      return "SUCCESS";

    }

    case "remove": {

      // Ensure all required arguments are present
      if (!name) throw new UtilError("ERR_NAME", args, context);

      // Iterate over all packages with the given name
      let packageIndex, found = false;
      while ((packageIndex = index.packages.findIndex(c => c.name === name)) !== -1) {
        found = true;

        const curr = index.packages[packageIndex];

        // Remove the package files and icon
        const iconPath = curr.icon.replace(address, repository);
        const filePath = curr.file.replace(address, repository);

        fs.unlinkSync(iconPath);
        fs.unlinkSync(filePath);

        // Remove the package from the index
        index.packages.splice(packageIndex, 1);

      }

      // If no packages with this name were found, throw ERR_NAME
      if (!found) throw new UtilError("ERR_NAME", args, context);

      // Save the index to the file if it exists
      if (file) Bun.write(file, JSON.stringify(index));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
