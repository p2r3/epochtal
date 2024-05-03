const UtilError = require("./error.js");

module.exports = async function (args, context = epochtal) {

  const [command, name] = args;

  const file = context.file.week;
  const week = context.data.week;

  switch (command) {

    case "list": {

      const output = [];

      for (let i = 0; i < week.categories.length; i ++) {
        output.push(week.categories[i].name);
      }

      return output;
    
    }

    case "getall": {

      return week.categories;

    }

    case "get": {

      const index = week.categories.findIndex(curr => curr.name === name);
      if (index === -1) throw new UtilError("ERR_CATEGORY", args, context);

      return week.categories[index];

    }

    case "remove": {

      const index = week.categories.findIndex(curr => curr.name === name);
      if (index === -1) throw new UtilError("ERR_CATEGORY", args, context);

      week.categories.splice(index, 1);
      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

    case "add": {

      for (let i = 2; i <= 7; i ++) {
        if (args[i] === undefined) throw new UtilError("ERR_ARGS", args, context);
      }

      const [title, portals, coop, lock, proof, points, slot] = args.slice(2);

      const newCategory = { name, title, portals, coop, lock, proof, points };

      if (slot === undefined) {
        week.categories.push(newCategory);
      } else {
        week.categories.splice(slot, 0, newCategory);
      }

      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

    case "edit": {

      const index = week.categories.findIndex(curr => curr.name === name);
      if (index === -1) throw new UtilError("ERR_CATEGORY", args, context);

      const key = args[2];
      let value = args[3];

      if (key === undefined || value === undefined) {
        throw new UtilError("ERR_ARGS", args, context);
      }

      if (value === "true") value = true;
      else if (value === "false") value = false;

      week.categories[index][key] = value;

      if (file) Bun.write(file, JSON.stringify(week));

      return "SUCCESS";

    }

  }
  
  throw new UtilError("ERR_COMMAND", args, context);

};