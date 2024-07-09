if (!("Entities" in this)) return;
IncludeScript("ppmod4");

// Sets ::epochtal_map to a(n array of) map path(s)
IncludeScript("epochtal_map");

// Set up some very early co-op prerequisites
local auto = Entities.CreateByClassname("logic_auto");
auto.AddScript("OnMapSpawn", function () {

  if (!IsMultiplayer()) return;

  // SendToConsole now only works on single player
  // The workaround for this is in main.js
  ::SendToConsole <- function (str) {
    printl("[SendToConsole] " + str);
  };

  local playerStart = ppmod.get("info_player_start");
  
  // Before blue spawns, move the spawner away from the teleport trigger
  ::playerStartPos <- playerStart.GetOrigin();
  playerStart.SetOrigin(::playerStartPos - Vector(0, 0, 128));

});

ppmod.onauto(async(function () {

  try {
    IncludeScript("epochtalmapmod");
  } catch (e) {
    printl("Not using any custom map modification script");
  }

  SendToConsole("sv_player_collide_with_laser 0");
  SendToConsole("sv_laser_cube_autoaim 1");
  SendToConsole("gameinstructor_enable 0");

  local index = pparray(epochtal_map).find(GetMapName());

  if (index == -1) {
    SendToConsole("changelevel " + epochtal_map[0]);
    throw "Not on tournament map!";
  }

  // Sets up co-op player spawns
  if (IsMultiplayer()) {

    // Control-flow blocking code is used carelessly here
    // That's fine though, you can't save in co-op anyway

    local blue = ppmod.get("blue");
    local red = ppmod.get("red");

    // On local games, ppmod.onauto runs without waiting for blue to re-teleport
    yield ppromise(function (resolve, reject) {
      if (!IsLocalSplitScreen()) return resolve();
      ppmod.wait(resolve, 1.5);
    });

    // Put blue inside of the teleport trigger
    blue.SetOrigin(::playerStartPos);
    red.moveType = 0;

    // Wait a bit for blue to teleport to the start of the map
    yield ppromise(function (resolve, reject):(blue) {
      ppmod.wait(function ():(blue, resolve) {
        ::playerStartPos = blue.GetOrigin();
        ::playerStartFvec <- blue.GetForwardVector();
        resolve();
      }, FrameTime() * 4); // ... kinda arbitrary
    });

    // Wait for blue to make room for orange
    local ref = { interval = null };
    ref.interval = ppmod.interval(function ():(blue, red, ref) {

      local bluepos = blue.GetOrigin();
      if ((bluepos - ::playerStartPos).Length2DSqr() <= 1024.0) return;
      ref.interval.Destroy();

      // Spawn in orange! Setup complete
      ::playerStartPos.z = bluepos.z;
      red.SetOrigin(::playerStartPos);
      red.SetForwardVector(::playerStartFvec);
      red.moveType = 2;

    });

    // Ensure that doors never close behind players
    ppmod.getall(["prop_testchamber_door"], function (ent) {
      ppmod.addoutput(ent, "OnFullyClosed", ent, "Open");
      ppmod.fire([ent.GetOrigin(), 32.0, "func_brush"], "Kill");
    });
    
    ppmod.hook("linked_portal_door", "Close", function () { return false });
    ppmod.hook("linked_portal_door", "close", function () { return false });
    ppmod.hook("func_areaportal", "Close", function () { return false });
    ppmod.hook("func_areaportal", "close", function () { return false });

    // Force-close all map portals
    local portal = null;
    while (portal = ppmod.get("prop_portal", portal)) {
      if (!portal.IsValid()) continue;
      portal.SetActivatedState(0);
      if (portal.GetName().len() == 0) continue;
      portal.SetHook("SetActivatedState", function () { return false });
    }

    ppmod.onportal(function (shot):(red) {

      if (!shot.weapon) return;
      if (!shot.portal) return;

      ppmod.fire("prop_portal", "SetLinkageGroupID", 99);
      ppmod.fire("prop_portal", "AddOutput", "PortalTwo 0", FrameTime() * 2);

    });

    ppmod.interval(function () {
      ppmod.keyval("weapon_portalgun", "CanFirePortal1", true);
      ppmod.keyval("weapon_portalgun", "CanFirePortal2", false);
    });

  }

  // Prepares the game for a series of consecutive maps
  if (epochtal_map.len() > 1) {

    local mapTextString = "      Playing map " + (index + 1) + " of " + epochtal_map.len() + "\n";
    local mapTextInstance = ppmod.text(mapTextString, 0, 1);

    ppmod.wait(function ():(mapTextInstance) {
      mapTextInstance.SetSize(0);
      mapTextInstance.SetFade(0.5, 0.5);
      mapTextInstance.Display(5.0);
    }, 1.0);

    SendToConsole("sar_speedrun_start_on_load 0");

    ppmod.hook("@relay_pti_level_end", "Trigger", function ():(index) {

      if (index + 1 >= epochtal_map.len()) {
        SendToConsole("sar_speedrun_stop");
        return true;
      }

      SendToConsole("map " + epochtal_map[index + 1]);
      return false;

    });

    // Allow the player to skip the map by pressing the co-op ping key
    // We make this a cheat command on purpose, so that it can be easily detected if needed
    SendToConsole("alias +mouse_menu \"sv_cheats 1;ent_fire @relay_pti_level_end Trigger;sv_cheats 0\"");
    
    // If this is the first map, teach the player about the map skip key
    if (index == 0) {
      
      ppmod.wait(function () {
        SendToConsole("gameinstructor_enable 1");
      }, 7.0);

      ppmod.wait(function () {

        local instructor = Entities.CreateByClassname("env_instructor_hint");
        local target = Entities.CreateByClassname("info_target_instructor_hint");

        instructor.hint_target = "epochtal_map_skip_hint_target";
        instructor.hint_static = true;
        instructor.hint_caption = "Skip Level";
        instructor.hint_binding = "mouse_menu";
        instructor.hint_timeout = 5;
        instructor.hint_color = "255 255 255";
        instructor.hint_icon_onscreen = "use_binding";

        instructor.ShowHint();

      }, 7.0 + FrameTime());

      ppmod.wait(function () {
        SendToConsole("gameinstructor_enable 0");
      }, 12.0);

    }

  } else { // Prepares for a single map (standard setup)

    SendToConsole("sar_speedrun_start_on_load 2");

    ppmod.hook("@relay_pti_level_end", "Trigger", function () {
      SendToConsole("sar_speedrun_stop");
      return true;
    });

  }

  // Wait until the player is in the map to set up the splits system
  ppmod.wait(function () {

    local player = IsMultiplayer() ? ppmod.get("blue") : GetPlayer();
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
    if (wPartner) if (wPartner.IsValid()) {

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

}));
