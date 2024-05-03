const jwt = require("jsonwebtoken");
const SteamAuth = require("../steamauth.js");

const keys = require("../../keys.js");
const users = require("../util/users.js");

const steam = new SteamAuth({
  realm: "http://epochtal.p2r3.com:3002", // Site name displayed to users on logon
  returnUrl: "http://epochtal.p2r3.com:3002/api/auth/return", // Return route
  apiKey: keys.steam // Steam API key
});

module.exports = async function (args, request) {

  const [command] = args;

  switch (command) {

    case "return": {

      const authuser = await steam.authenticate(request);
      const user = await users(["get", authuser.steamid]);

      if (!user) {
        await users(["add", authuser.steamid, authuser.username]);
      } else {
        await users(["edit", authuser.steamid, "name", authuser.username]);
      }

      const token = jwt.sign(authuser, keys.jwt);
      const headers = new Headers({
        "Set-Cookie": `steam_token=${token};path=/;max-age=604800;HttpOnly;`,
        "Location": "/"
      });

      return new Response(null, {
        status: 302,
        headers: headers
      });

    }

    case "login": {

      const url = await steam.getRedirectUrl();
      return Response.redirect(url, 302);

    }

    case "logout": {

      const headers = new Headers({
        "Set-Cookie": `steam_token=;path=/;max-age=0;HttpOnly;`,
        "Location": "/"
      });

      return new Response(null, {
        status: 302,
        headers: headers
      });

    }
  
  }

  return "ERR_COMMAND";

};
