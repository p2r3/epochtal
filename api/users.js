const jwt = require("jsonwebtoken");

const keys = require("../../keys.js");
const users = require("../util/users.js");

function getUserToken (request) {

  try {

    const token = request.headers.get("Cookie").split("steam_token=")[1].split(";")[0];
    const data = jwt.verify(token, keys.jwt);

    if (!data) return null;
    return data;

  } catch (err) {

    return null;

  }

};

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

module.exports = async function (args, request) {

  const [command] = args;
  
  switch (command) {

    case "whoami": {

      if (request.headers.get("Authentication") === keys.internal) {
        return serverUser;
      }

      const user = getUserToken(request);
      if (!user) return null;
      
      user.epochtal = await users(["get", user.steamid]);
      return user;

    }

    case "get": {

      return users(["list"]);

    }

  }

  return "ERR_COMMAND";

};
