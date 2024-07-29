const jwt = require("jsonwebtoken");
const fs = require("node:fs");

const users = require("../util/users.js");
const profiledata = require("../util/profiledata.js");

/**
 * Decrypt the user token cookie from the request headers.
 *
 * @param {HttpRequest} request The request object
 * @returns {object} The user data
 */
function getUserToken (request) {

  try {

    // Get the token from the request headers
    const token = request.headers.get("Cookie").split("steam_token=")[1].split(";")[0];
    // Verify the token and return the data
    const data = jwt.verify(token, process.env.JWT_SECRET);

    if (!data) return null;
    return data;

  } catch {

    return null;

  }

};

/**
 * The server user object. This user is used for internal requests.
 */
const serverUser = {
  steamid: "00000000000000000",
  username: "server",
  epochtal: {
    name: "server",
    banned: false,
    points: 999,
    admin: true
  }
};

/**
 * Handles `/api/users/` endpoint requests. This endpoint supports the following commands:
 *
 * - `whoami`: Get the current user.
 * - `get`: Get all users.
 * - `profile`: Get a user's profile data.
 * - `profilelog`: Get a user's profile log.
 *
 * @param {string[]} args The arguments for the api request
 * @param {HttpRequest} request The http request object
 * @returns {string|object} The response of the api request
 */
module.exports = async function (args, request) {

  const [command] = args;

  switch (command) {

    case "whoami": {

      // Check if the request is internal and return the server user
      if (request.headers.get("Authentication") === process.env.INTERNAL_SECRET) {
        return serverUser;
      }

      // Get the user token.
      const user = getUserToken(request);
      if (!user) return null;

      // Get the user data and return it
      user.epochtal = await users(["get", user.steamid]);
      return user;

    }

    case "get": {

      // Return a list of all users
      return users(["list"]);

    }

    case "profile": {

      // Get the profile data for the specified user
      const steamid = args[1];
      return await profiledata(["get", steamid]);

    }

    case "profilelog": {

      // Get the profile log for the specified user
      const steamid = args[1];
      const logPath = `${epochtal.file.profiles}/${steamid}/profile.log`;
      if (!fs.existsSync(logPath)) return "ERR_NOTFOUND";

      return Response(Bun.file(logPath));

    }

  }

  return "ERR_COMMAND";

};
