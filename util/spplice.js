const UtilError = require("./error.js");

const fs = require("node:fs");
const { $ } = require("bun");
const tmppath = require("./tmppath.js");

async function archiveFiles (portal2) {

  const output = (await tmppath()) + ".tar.xz";
  await $`XZ_OPT=-9e tar -cJf ${output} -C ${portal2} .`;

  return output;

}

module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  const file = context.file.spplice.index;
  const index = context.data.spplice.index;

  const repository = context.file.spplice.repository;
  const address = context.data.spplice.address;

  switch (command) {

    case "get": {

      if (!name) return index;

      const package = index.packages.find(c => c.name === name);
      if (package) return package;
      return null;

    }

    case "add": {

      for (let i = 1; i <= 6; i ++) if (!args[i]) throw new UtilError("ERR_ARGS", args, context);
      const [portal2, title, author, icon, description, weight] = args.slice(2);

      if (!("packages" in index)) {
        index.packages = [];
      }

      if (!fs.existsSync(portal2) || !fs.lstatSync(portal2).isDirectory()) {
        throw new UtilError("ERR_GAMEFILES", args, context);
      }
      if (name.includes("..") || name.includes("/")) {
        throw new UtilError("ERR_NAME", args, context);
      }

      let iconLink, iconPath;
      if (icon.startsWith("http://") || icon.startsWith("https://")) {

        const response = await fetch(icon);
        const mime = response.headers.get("Content-Type");

        if (!mime.startsWith("image/")) throw new UtilError("ERR_ICON", args, context);

        const extension = mime.split("/")[1].split("+")[0];
        const filename = `${name}.${extension}`;
        iconPath = `${repository}/${filename}`;

        await $`wget ${icon} -O ${iconPath}`.quiet();
        iconLink = `${address}/${filename}`;

      } else {

        if (!fs.existsSync(iconLink)) throw new UtilError("ERR_ICON", args, context);

        const extension = icon.split(".").pop();
        const filename = `${name}.${extension}`;
        iconPath = `${repository}/${filename}`;

        fs.copyFileSync(icon, iconPath);
        iconLink = `${address}/${filename}`;

      }

      let archiveLink;
      try {
        const archivedFilesPath = await archiveFiles(portal2);
        fs.renameSync(archivedFilesPath, `${repository}/${name}.tar.xz`);
        archiveLink = `${address}/${name}.tar.xz`;
      } catch (err) {
        fs.unlinkSync(iconPath);
        throw new UtilError("ERR_ARCHIVE: " + err.message, args, context, "spplice", err.stack);
      }

      index.packages.push({
        title,
        name,
        author,
        description,
        icon: iconLink,
        file: archiveLink,
        weight: weight || 100
      });

      if (file) Bun.write(file, JSON.stringify(index));
      return "SUCCESS";

    }

    case "remove": {

      if (!name) throw new UtilError("ERR_NAME", args, context);

      const packageIndex = index.packages.findIndex(c => c.name === name);
      if (packageIndex === -1) throw new UtilError("ERR_NAME", args, context);

      const package = index.packages[packageIndex];

      const iconPath = package.icon.replace(address, repository);
      const filePath = package.file.replace(address, repository);

      fs.unlinkSync(iconPath);
      fs.unlinkSync(filePath);

      index.packages.splice(packageIndex, 1);

      if (file) Bun.write(file, JSON.stringify(index));
      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
