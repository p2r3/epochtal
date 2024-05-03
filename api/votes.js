const votes = require("../util/votes.js");
const api_users = require("./users.js");

module.exports = async function (args, request) {

  const [command, map] = args;

  const user = await api_users(["whoami"], request);
  if (!user) return "ERR_LOGIN";

  switch (command) {

    case "get": {
    
      return await votes(["get", user.steamid]);

    }

    case "upvote":
    case "downvote": {

      return await votes([command, user.steamid, map]);

    }

  }

  return "ERR_COMMAND";

};
