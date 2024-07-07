const jwt = require("jsonwebtoken");
const SteamAuth = require("../steamauth.js");

const keys = require("../../keys.js");
const users = require("../util/users.js");

/**
 * Steam authentication instance.
 * This object is used to authenticate users through Steam and fetch their profile data.
 *
 * @see https://developer.valvesoftware.com/wiki/Steam_Web_API
 * @type {SteamAuth}
 */
const steam = new SteamAuth({
  realm: "https://epochtal.p2r3.com", // Site name displayed to users on logon
  returnUrl: "https://epochtal.p2r3.com/api/auth/return", // Return route after authentication
  apiKey: keys.steam // Steam API key
});

/**
 * Handles `/api/auth/` endpoint requests. This endpoint supports the following commands:
 *
 * - `return`: Authenticates the user with Steam and sets a session cookie. This request is automatically triggered by the Steam login page.
 * - `login`: Redirects the user to the Steam login page
 * - `logout`: Clears the user's session cookie
 *
 * @param args The arguments for the api request
 * @param request The http request object
 * @returns {Response} The response of the api request
 */
module.exports = async function (args, request) {

  const [command] = args;

  switch (command) {

    case "return": {

      // Verify authentication with Steam
      const authuser = await steam.authenticate(request);
      // Fetch existing epochtal user data
      const user = await users(["get", authuser.steamid]);

      // Create or update the user in the epochtal database
      if (!user) {
        await users(["add", authuser.steamid, authuser.username, authuser.avatarmedium]);
      } else {
        await users(["authupdate", authuser.steamid, authuser]);
      }

      // Sign the user data and set a session cookie
      // and redirect the user to the home page
      const token = jwt.sign(authuser, keys.jwt);
      const headers = new Headers({
        "Set-Cookie": `steam_token=${token};path=/;max-age=604800;HttpOnly;`,
        "Location": "/"
      });

      // Return confirmation and redirect
      return new Response(null, {
        status: 302,
        headers: headers
      });

    }

    case "login": {

      // Redirect the user to the Steam login page
      const url = await steam.getRedirectUrl();
      return Response.redirect(url, 302);

    }

    case "logout": {

      // Overwrite the session cookie with an empty value
      // and redirect the user to the home page
      const headers = new Headers({
        "Set-Cookie": `steam_token=;path=/;max-age=0;HttpOnly;`,
        "Location": "/"
      });

      // Return confirmation and redirect
      return new Response(null, {
        status: 302,
        headers: headers
      });

    }

  }

  return "ERR_COMMAND";

};
