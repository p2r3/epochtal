const UtilError = require("./error.js");

const keys = require("../../keys.js");

module.exports = async function (args, context = epochtal) {

  const command = args[0];
  const message = args.slice(1).join(" ");

  switch (command) {

    case "announce":

      discordClient.channels.cache.get(context.data.discord.announce).send(message);
      return "SUCCESS";

    case "report":
      
      discordClient.channels.cache.get(context.data.discord.report).send(message)
      return "SUCCESS";
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
