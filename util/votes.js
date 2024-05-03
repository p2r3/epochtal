const UtilError = require("./error.js");

module.exports = async function (args, context = epochtal) {
  
  const [command, steamid, map] = args;

  const file = context.file.week;
  const week = context.data.week;
  const users = context.data.users;
  
  if (!(steamid in users)) throw new UtilError("ERR_STEAMID", args, context);

  switch (command) {
    
    case "get": {
     
      return week.votes[steamid] || Array(week.votingmaps.length).fill(0);

    }

    case "upvote":
    case "downvote": 
    case "reset": {

      if (!week.voting) throw new UtilError("ERR_LOCKED", args, context);

      if ((!map && map !== 0) || map < 0 || map > week.votingmaps.length - 1) throw new UtilError("ERR_MAP", args, context);

      if (!week.votes[steamid]) {
        week.votes[steamid] = Array(week.votingmaps.length).fill(0);
      }
      
      week.votes[steamid][map] = command === "upvote" ? 1 : (command === "downvote" ? -1 : 0);
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }
    
  }

  throw new UtilError("ERR_COMMAND", args, context);
  
};
