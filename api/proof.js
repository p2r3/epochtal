const api_users = require("./users.js");
const users = require("../util/users.js");
const proof = require("../util/proof.js");
const archive = require("../util/archive.js");

module.exports = async function (args, request) {

  const [command, steamid, category] = args;

  const user = await api_users(["whoami"], request);
  if (!user) return "ERR_LOGIN";

  switch (command) {

    case "download": {

      const epochtalUser = await users(["get", user.steamid]);
      if (!epochtalUser || !epochtalUser.admin) return "ERR_PERMS";

      const path = await proof(["file", steamid, category]);
      const file = Bun.file(path);

      return new Response(file);

    }

    case "archive": {

      const archiveName = args[3];
      const archiveContext = await archive(["get", archiveName]);

      const path = await proof(["file", steamid, category], archiveContext);
      const file = Bun.file(path);

      return new Response(file);

    }

  }

  return "ERR_COMMAND";

};
