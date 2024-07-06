const UtilError = require("./error.js");

const categories = require("./categories.js");
const weeklog = require("./weeklog.js");

module.exports = async function (args, context = epochtal) {

  const [command, category, steamid] = args;
  
  const data = context.data.leaderboard;
  const file = context.file.leaderboard;

  let categoryData;
  if (category) {
    categoryData = await categories(["get", category], context);
  }

  let lb;
  if (categoryData) {
    if (!(category in data)) data[category] = [];
    lb = data[category];
  }
  
  switch (command) {
    
    case "list": {

      return Object.keys(data);

    }

    case "get": {
    
      let output = [];

      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);

      let placement = 1;
      for (let i = 0; i < lb.length; i ++) {
        
        if (i !== 0 && lb[i].time !== lb[i-1].time) {
          placement ++;
        }
        lb[i].placement = placement;
        
        output.push(lb[i]);
        
      }
      
      return output;
    
    }
      
    case "remove": {
      
      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);
      
      const idx = lb.findIndex(function (curr) {
        return curr.steamid === steamid;
      });
      
      if (idx === -1) throw new UtilError("ERR_NOTFOUND", args, context);
      
      data[category].splice(idx, 1);
      if (file) Bun.write(file, JSON.stringify(data));
      
      await weeklog(["add", steamid, category, 0, 0], context);

      return "SUCCESS";
      
    }

    case "add": {
    
      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);
      if (categoryData.lock) throw new UtilError("ERR_LOCKED", args, context);

      const [time, note, portals, segmented] = args.slice(3);

      for (let i = 2; i <= 4; i ++) {
        if (args[i] === undefined) throw new UtilError("ERR_ARGS", args, context);
      }

      if (isNaN(time) || time <= 0) throw new UtilError("ERR_TIME", args, context);

      if (note.length > 200) throw new UtilError("ERR_NOTE", args, context);
      
      if (!("portals" in categoryData)) throw new UtilError("ERR_CATEGORY", args, context);
      const countPortals = categoryData.portals;
      if (countPortals && isNaN(portals)) throw new UtilError("ERR_PORTALS", args, context);
      
      const oldRunIndex = lb.findIndex(function (curr) {
        return curr.steamid === steamid;
      });
      if (oldRunIndex !== -1) lb.splice(oldRunIndex, 1);
      
      const newRun = { steamid, time, note };
      
      let inserted = false;

      if (countPortals) {

        newRun.portals = portals;
        newRun.segmented = segmented;

        for (let i = 0; i < lb.length; i ++) {

          if (portals > lb[i].portals) continue;

          if (portals === lb[i].portals) {
            if (segmented && !lb[i].segmented) continue;
            if (segmented === lb[i].segmented) {
              if (time >= lb[i].time) continue;
            }
          }

          lb.splice(i, 0, newRun);
          inserted = true;
          break;
        
        }

      } else {

        for (let i = 0; i < lb.length; i ++) {

          if (time >= lb[i].time) continue;

          lb.splice(i, 0, newRun);
          inserted = true;
          break;
        
        }
        
      }

      if (!inserted) lb.push(newRun);

      if (file) Bun.write(file, JSON.stringify(data));

      await weeklog(["add", steamid, category, time, portals], context);

      return "SUCCESS";

    }
    
    case "edit": {
  
      if (lb === undefined) throw new UtilError("ERR_CATEGORY", args, context);
      if (categoryData.lock) throw new UtilError("ERR_LOCKED", args, context);
  
      const note = args[3];
      if (note === undefined) throw new UtilError("ERR_ARGS", args, context);
  
      if (note.length > 200) throw new UtilError("ERR_NOTE", args, context);

      const run = lb.find(curr => curr.steamid === steamid);
      run.note = note;

      if (file) Bun.write(file, JSON.stringify(data));
      return "SUCCESS";
  
    }
  
    throw new UtilError("ERR_COMMAND", args, context);

  }

};
