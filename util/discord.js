const UtilError = require("./error.js");

const keys = require("../../keys.js");

module.exports = async function (args, context = epochtal) {

  const command = args[0];
  const content = Array.isArray(args[2]) ? args[1] : args.slice(1).join(" ");
  const files = Array.isArray(args[2]) ? args[2] : [];

  switch (command) {

    case "announce":

      await discordClient.channels.cache.get(context.data.discord.announce).send({ content, files });
      return "SUCCESS";

    case "report":
      
      await discordClient.channels.cache.get(context.data.discord.report).send({ content, files });
      return "SUCCESS";
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
