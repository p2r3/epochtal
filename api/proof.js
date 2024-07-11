const api_users = require("./users.js");
const users = require("../util/users.js");
const proof = require("../util/proof.js");
const archive = require("../util/archive.js");

/**
 * Handles `/api/proof/` endpoint requests. This endpoint supports the following commands:
 *
 * - `download`: Download a proof file.
 * - `archive`: Download a proof file from an archive.
 *
 * @param args The arguments for the api request
 * @param request The http request object
 * @returns {Response<BunFile>} The response of the api request
 */
module.exports = async function (args, request) {

  const [command, steamid, category] = args;

  // Get the active user and throw ERR_LOGIN if not logged in
  const user = await api_users(["whoami"], request);
  if (!user) return "ERR_LOGIN";

  switch (command) {

    case "download": {

      // Ensure the user is an admin
      const epochtalUser = await users(["get", user.steamid]);
      if (!epochtalUser || !epochtalUser.admin) return "ERR_PERMS";

      // Grab the proof and return it
      const path = await proof(["file", steamid, category]);
      const file = Bun.file(path);

      return new Response(file);

    }

    case "archive": {

      // Get the context of the specified archive
      const archiveName = args[3];
      const archiveContext = await archive(["get", archiveName]);

      // Grab the proof and return it
      const path = await proof(["file", steamid, category], archiveContext);
      const file = Bun.file(path);

      return new Response(file);

    }

  }

  return "ERR_COMMAND";

};
