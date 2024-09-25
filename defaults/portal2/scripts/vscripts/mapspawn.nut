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

  // Don't transition if this is a workshop map
  // TODO: This is a workaround for lobbies, ideally we'd have a separate check
  // This is fine for now, because you can't access workshop maps from the menu anyway
  // The only thing we're trying to prevent is people doing CM/fullgame accidentally
  local isWorkshop = GetMapName().tolower().slice(0, 9) == "workshop/";
  local isLobby = index == -1 && isWorkshop;

  if (index == -1 && !isWorkshop) {
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

      // Spawn in orange
      ::playerStartPos.z = bluepos.z;
      red.SetOrigin(::playerStartPos);
      red.SetForwardVector(::playerStartFvec);
      red.moveType = 2;

      // On some maps, the elevator becomes solid after it departs
      // We set the respawn position to wherever orange is by the time they've moved 96 units
      ref.interval = ppmod.interval(function ():(red, ref) {

        if ((red.GetOrigin() - ::playerStartPos).Length2DSqr() > 9216.0) {
          local playerStart = ppmod.get("info_player_start");
          playerStart.SetOrigin(red.GetOrigin());
          playerStart.SetForwardVector(::playerStartFvec);

          ref.interval.Destroy();
        }

      });

    });

    // Ensure that doors don't close behind players if someone's been close enough to enter them
    ppmod.getall(["prop_testchamber_door"], function (ent) {

      ent.AddScript("OnClose", function ():(ent) {

        if (!ent.IsValid()) return;

        local curr = null;
        local classes = ["player", "linked_portal_door"];

        for (local i = 0; i < classes.len(); i ++) {
          while (curr = ppmod.get(classes[i], curr)) {

            local doorpos = ent.GetOrigin();
            local dist = (curr.GetOrigin() - doorpos).LengthSqr();
            if (dist > 65536) continue; // If over 256 units away, don't keep the door open

            ppmod.addoutput(ent, "OnFullyClosed", ent, "Open");

            return;

          }
        }

      });

      ppmod.fire([ent.GetOrigin(), 32.0, "func_brush"], "Kill");

    });

    ppmod.hook("linked_portal_door", "Close", function () { return false });
    ppmod.hook("linked_portal_door", "close", function () { return false });
    ppmod.hook("func_areaportal", "Close", function () { return false });
    ppmod.hook("func_areaportal", "close", function () { return false });

    // Force-close all map portals
    ppmod.fire("prop_portal", "SetActivatedState", 0);
    ppmod.keyval("prop_portal", "Targetname", "");

    ppmod.wait(function () {
      ppmod.hook("prop_portal", "SetActivatedState", function () { return false });
      ppmod.hook("prop_portal", "setactivatedstate", function () { return false });
    }, FrameTime());

    // In networked games, if blue fired this portal, we need to get orange's client to update
    // The way I've found to do this is by resizing the portals (after a hacky ping-pong with orange)
    local ccom = Entities.CreateByClassname("point_clientcommand");
    local size = { height = 54.0 };

    if (!IsLocalSplitScreen()) {
      ::coopUpdatePortals <- function ():(red, size, ccom) {

        if (size.height == 54.0) size.height = 53.95;
        else size.height = 54.0;

        ppmod.fire("prop_portal", "Resize", "32 " + size.height);

        SendToConsole("hud_saytext_time 12");
        ccom.Command("echo [SendToConsole] hud_saytext_time 12", 0, red);

      };
    }

    ppmod.onportal(function (shot):(blue, red, ccom) {

      if (!shot.weapon) return;
      if (!shot.portal) return;

      ppmod.fire("prop_portal", "SetLinkageGroupID", 99);

      if (IsLocalSplitScreen()) return;

      local isBlueWeapon = (shot.weapon.GetOrigin() - blue.GetOrigin()).LengthSqr() < 256.0;
      if (!isBlueWeapon) return;

      SendToConsole("hud_saytext_time 0");
      ccom.Command("echo [coop_portal_ping]", 0, red);

    });

    ppmod.interval(function () {
      ppmod.keyval("weapon_portalgun", "CanFirePortal1", true);
      ppmod.keyval("weapon_portalgun", "CanFirePortal2", false);
    });

    local playerdie = Entities.CreateByClassname("trigger_brush");
    playerdie.targetname = "game_playerdie";
    playerdie.AddOutput("OnUse", "prop_portal", "SetActivatedState", 0);

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

      SendToConsole("changelevel " + epochtal_map[index + 1]);
      return false;

    });

    // Allow the player to skip the map by pressing the co-op ping key
    // We make this a console command on purpose, so that it can be easily detected if needed
    if (index + 1 < epochtal_map.len()) {
      SendToConsole("alias +mouse_menu \"changelevel "+ epochtal_map[index + 1] +"\"");
    }

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

    ppmod.hook("@relay_pti_level_end", "Trigger", function ():(isLobby) {
      SendToConsole("sar_speedrun_stop");
      // TODO: Temporary solution, to be revisited when lobbies get more attention
      if (isLobby) SendToConsole("disconnect");
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
      { name = "prop_testchamber_door", prefix = "epochtal_split_door", output = "OnOpen", array = pparray() },
      { name = "prop_button", prefix = "epochtal_split_pbutton", output = "OnPressed", array = pparray() },
      { name = "prop_floor_button", prefix = "epochtal_split_fbutton", output = "OnPressed", array = pparray() },
      { name = "prop_floor_cube_button", prefix = "epochtal_split_cbutton", output = "OnPressed", array = pparray() },
      { name = "prop_floor_ball_button", prefix = "epochtal_split_bbutton", output = "OnPressed", array = pparray() },
      { name = "prop_laser_catcher", prefix = "epochtal_split_laserc", output = "OnPowered", array = pparray() },
      { name = "prop_laser_relay", prefix = "epochtal_split_laserrl", output = "OnPowered", array = pparray() }
    ];

    // Old Aperture equivalents of the above targets
    // These are pushed after declaration to allow for sharing the targets' arrays
    targets.push({ name = "models/props_underground/test_chamber_door.mdl", prefix = "epochtal_split_door", output = "OnAnimationBegun", array = targets[0].array });
    targets.push({ name = "prop_under_button", prefix = "epochtal_split_pbutton", output = "OnPressed", array = targets[1].array });
    targets.push({ name = "prop_under_floor_button", prefix = "epochtal_split_fbutton", output = "OnPressed", array = targets[2].array });

    for (local i = 0; i < targets.len(); i ++) {

      local target = targets[i];
      local ent = null;

      while (ent = ppmod.get(target.name, ent)) {

        if (!ent.IsValid()) continue;
        target.array.push(ent);

        ppmod.addscript(ent, target.output, function ():(nextSplit, ent, target) {
          local index = target.array.find(ent);
          if (index == -1) return;
          target.array[index] = null;

          nextSplit.name = target.prefix + (index + 1);
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
      if (!firstDoor) firstDoor = ppmod.get(player.GetOrigin(), 1024, "models/props_underground/test_chamber_door.mdl");

      local index = targets[0].array.find(firstDoor);
      if (index != -1) {
        targets[0].array.remove(index);
        targets[0].array.insert(0, firstDoor);
      }

    }

    local dummy = Entities.CreateByClassname("logic_relay");

    // Check every tick if it's time to call the next split
    ppmod.interval(function ():(nextSplit, dummy) {

      if (nextSplit.name == null) return;
      if (nextSplit.time + 0.1 > Time()) return;

      dummy.targetname = nextSplit.name;
      EntFire(nextSplit.name, "Trigger");
      nextSplit.name = null;

      // Request timestamp on split for additional verification opportunities
      printl("[RequestTimestamp]");

    });

  }, 0.2);

}));

::serverUnreachable <- function () {

  local title = ppmod.text("Server Unreachable", -1, 0.4);
  local text = ppmod.text(
    "Failed to request data from the Epochtal API.\n" +
    "Please make sure you're connected to the internet and restart the run.\n" +
    "Runs performed offline are not verifiable and will be rejected.",
    -1, 0.5
  );

  title.SetSize(5);
  text.SetSize(0);
  title.SetColor("255 100 100");
  text.SetColor("255 100 100");

  ppmod.interval(function ():(title, text) {
    title.Display();
    text.Display();
  });

  SendToConsole("fadeout 0.5 30 0 0 0");

};
