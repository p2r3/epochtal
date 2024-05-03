if (!("Entities" in this)) return;
IncludeScript("ppmod4");

// Sets ::epochtal_map to a(n array of) map path(s)
IncludeScript("epochtal_map");

ppmod.onauto(function () {

  try {
    IncludeScript("epochtalmapmod");
  } catch (e) {
    printl("Not using any custom map modification script");
  }

  SendToConsole("sv_player_collide_with_laser 0");
  SendToConsole("sv_laser_cube_autoaim 1");

  local index = pparray(epochtal_map).find(GetMapName());

  if (index == -1) {
    SendToConsole("map " + epochtal_map[0]);
    throw "Not on tournament map!";
  }

  // Prepares the game for a series of consecutive maps
  if (epochtal_map.len() > 1) {

    local mapTextString = "      Playing map " + (index + 1) + " of " + epochtal_map.len() + "\n";
    local mapTextInstance = ppmod.text(mapTextString, 0, 1);

    mapTextInstance.SetSize(0);
    mapTextInstance.SetFade(0.5, 0.5);
    mapTextInstance.Display(5.0);

    SendToConsole("sar_speedrun_start_on_load 0");

    ppmod.hook("@relay_pti_level_end", "Trigger", function ():(index) {

      if (index + 1 >= epochtal_map.len()) {
        SendToConsole("sar_speedrun_stop");
        return true;
      }

      SendToConsole("map " + epochtal_map[index + 1]);
      return false;

    });

  } else { // Prepares for a single map (standard setup)

    SendToConsole("sar_speedrun_start_on_load 2");

    ppmod.hook("@relay_pti_level_end", "Trigger", function () {
      SendToConsole("sar_speedrun_stop");
      return true;
    });

  }

  // Wait until the player is in the map to set up the splits system
  ppmod.wait(function () {

    local player = ppmod.get("player");
    local startPos = player.GetOrigin();
    
    // PeTI and BEEMod maps have world portals at the entrance
    local wPartner, wPortal = ppmod.get(startPos, 1024, "linked_portal_door");
    if (wPortal) {
      wPartner = wPortal.GetPartnerInstance();
      if (wPartner.IsValid()) startPos = wPartner.GetOrigin();
    }

    local nextSplit = {
      name = null,
      time = Time()
    };

    local targets = [
      { classname = "prop_testchamber_door", prefix = "epochtal_split_door", output = "OnOpen", array = pparray() },
      { classname = "prop_button", prefix = "epochtal_split_pbutton", output = "OnPressed", array = pparray() },
      { classname = "prop_floor_button", prefix = "epochtal_split_fbutton", output = "OnPressed", array = pparray() },
      { classname = "prop_floor_cube_button", prefix = "epochtal_split_cbutton", output = "OnPressed", array = pparray() },
      { classname = "prop_laser_catcher", prefix = "epochtal_split_bbutton", output = "OnPowered", array = pparray() }
      { classname = "prop_laser_relay", prefix = "epochtal_split_bbutton", output = "OnPowered", array = pparray() }
    ];

    for (local i = 0; i < targets.len(); i ++) {

      local target = targets[i];
      local ent = null;

      while (ent = Entities.FindByClassname(ent, target.classname)) {

        if (!ent.IsValid()) continue;
        target.array.push(ent);

        ppmod.addscript(ent, target.output, function ():(nextSplit, ent, target) {
          nextSplit.name = target.prefix + (target.array.find(ent) + 1);
          nextSplit.time = Time();
        });

      }

      target.array.sort(function (a, b):(startPos) {
        if ((a.GetOrigin() - startPos).LengthSqr() > (b.GetOrigin() - startPos).LengthSqr()) return 1;
        else return -1;
      });

    }

    // If the map starts with a world portal, move the door in the elevator room down the list
    // Otherwise, the entrance door gets treated as being very far from the start
    if (wPartner.IsValid()) {

      // Remove the duplicate door
      targets[0].array.remove(0);

      local firstDoor = ppmod.get(player.GetOrigin(), 1024, "prop_testchamber_door");
      local index = targets[0].array.find(firstDoor);

      targets[0].array.remove(index);
      targets[0].array.insert(0, firstDoor);

    }

    local dummy = Entities.CreateByClassname("logic_relay");

    // Check every tick if it's time to call the next split
    ppmod.interval(function ():(nextSplit, dummy) {
      
      if (nextSplit.name == null) return;
      if (nextSplit.time + 0.1 > Time()) return;

      dummy.targetname = nextSplit.name;
      EntFire(nextSplit.name, "Trigger");
      nextSplit.name = null;

    });

  }, 0.2);

});
