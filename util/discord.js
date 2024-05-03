const UtilError = require("./error.js");

const keys = require("../../keys.js");

const channels = {
  announce: "1063171316875788338",
  report: "1059311594116497509"
};

module.exports = async function (args, context = epochtal) {

  const command = args[0];
  const message = args.slice(1).join(" ");

  switch (command) {

    case "announce":

      discordClient.channels.cache.get(channels.announce).send(message);
      return "SUCCESS";

    case "report":
      
      discordClient.channels.cache.get(channels.report).send(message)
      return "SUCCESS";
  
  }

  throw new UtilError("ERR_COMMAND", args, context);

};
