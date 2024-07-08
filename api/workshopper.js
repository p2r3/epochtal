const curator = require("../util/curator.js");
const api_users = require("./users.js");

module.exports = async function (args, request) {

  const [command, mapid] = args;

  const file = Bun.file(`${__dirname}/../suggestions.json`);
  const maps = await file.json();

  const user = await api_users(["whoami"], request);
  if (!user) return "ERR_LOGIN";

  switch (command) {

    case "suggest": {

      if (!mapid || isNaN(mapid)) return "ERR_MAPID";
      if (maps.find(c => c.id === mapid)) return "ERR_EXISTS";

      const v1 = await curator(["v1", mapid]);
      const v2 = await curator(["v2", mapid]);

      maps.push({ v1, v2, id: mapid });
      Bun.write(file, JSON.stringify(maps));

      return "SUCCESS";

    }

  }

  return "ERR_COMMAND";

};
