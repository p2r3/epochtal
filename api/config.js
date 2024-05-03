module.exports = async function (args, request) {

  const [command, category] = args;

  const week = epochtal.data.week;

  switch (command) {

    case "get": {
    
      return {
        number: week.number,
        date: week.date,
        voting: week.voting,
        bonus: week.bonus,
        votingmaps: week.votingmaps,
        maps: week.maps,
        categories: week.categories
      };

    }

  }

  return "ERR_COMMAND";

};
