const UtilError = require("./error.js");

module.exports = async function (args, context = epochtal) {

  const [command, field] = args;

  const file = context.file.week;
  const week = context.data.week;

  const config = {
    number: week.number,
    date: week.date,
    voting: week.voting,
    bonus: week.bonus
  };

  switch (command) {

    case "get": {

      if (!field) return config;
      if (!(field in config)) throw new UtilError("ERR_FIELD", args, context);
      return config[field];

    }

    case "edit": {

      const value = args[2];
      if (!(field in config)) throw new UtilError("ERR_FIELD", args, context);
      if (value === undefined) throw new UtilError("ERR_VALUE", args, context);

      week[field] = value;
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

    case "fixdate": {

      const today = new Date();

      let mapReleaseDate = new Date(today.getTime() - (today.getDay() + 6) % 7 * 24 * 60 * 60 * 1000);
      mapReleaseDate.setUTCHours(12, 0, 0, 0);
      mapReleaseDate = Math.floor(mapReleaseDate.getTime() / 1000);

      week.date = mapReleaseDate;
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};

