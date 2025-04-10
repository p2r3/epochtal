// This print statement is found in the original mapspawn.nut file
// There's no reason to keep it, other than to maintain normal console output
printl("==== calling mapspawn.nut");

// Ensure we're running on the server's script scope
if (!("Entities" in this)) return;

// The entrypoint function - called once entity I/O has initialized
::__elInit <- function () {
  /**
   * Create a "logic_auto" entity for linking functions on load, but only
   * if we haven't done that already, to ensure we create only one.
   *
   * This is the only entity created by this script. It is harmless, and
   * practically unconfigurable. Almoast every map already has one, we're
   * just making sure that we have one that we can rely on.
   */
  if (Entities.FindByName(null, "__elLogicAuto")) return;
  local auto = Entities.CreateByClassname("logic_auto");
  auto.__KeyValueFromString("Targetname", "__elLogicAuto");
  auto.ConnectOutput("OnNewGame", "__elLoad");
  auto.ConnectOutput("OnLoadGame", "__elLoad");
  ::__elFirstInit();
};

/**
 * On the very first load, since we've only just created a "logic_auto",
 * it cannot yet be used for detecting when the map has fully loaded.
 * Instead, we recursively check for if the player has finished loading,
 * and then manually call the on-load functions.
 */
::__elFirstInit <- function () {
  if (!GetPlayer()) {
    EntFireByHandle(Entities.First(), "RunScriptCode", "::__elFirstInit()", FrameTime(), null, null);
    return;
  } else {
    ::__elSetup();
    ::__elLoad();
  }
};

// Called only once on the initial map load
::__elSetup <- function () {
  // Make some saves to prevent accidentally loading into a different map
  SendToConsole("save quick");
  SendToConsole("save autosave");
  // Connect outputs to run finish events
  EntFire("@relay_pti_level_end", "AddOutput", "OnTrigger !self:RunScriptCode:__elFinish():0:1");
};

// Called after the map has finished loading, on every load
::__elLoad <- function () {
  // Start (or resume) elTick recursion
  // The tick counter is reset to 0 to cleanly separate different sessions
  ::__elTicks <- 0;
  ::__elTick();
};

// Called when the map end condition is reached
::__elFinish <- function () {
  // Print run end signature, which is then detected by main.js
  printl("elFinish");
};

/**
 * This function is called on every console tick, i.e. 30 times per second.
 *
 * We achieve this by recursively running the `script` console command to
 * delay the next execution of the function into the next console tick.
 * This has the added benefit of maintaining the timer during pauses.
 */
::__elTick <- function () {

  // Increment the tick timer and print it with a signature
  // This is monitored in main.js to sum up times of different sessions
  ::__elTicks ++;
  printl("spec_goto_tick " + __elTicks);

  // Schedule this function for the next console tick
  SendToConsole("script ::__elTick()");

  /**
   * The events below create updates for spectators - we print the position
   * of the two portals, and the cube nearest to the player, to the console.
   * Printing the player position is done with "spec_pos" in main.js, which
   * is why "spec_goto" is used as the signature everywhere - it's the only
   * key we filter using "con_filter_text_out".
   */

  // Report position and angles of portals
  local p1, p2, curr;
  while (curr = Entities.FindByClassname(curr, "prop_portal")) {
    if (curr.GetModelName() == "models/portals/portal1.mdl") {
      p1 = curr;
    } else if (curr.GetModelName() == "models/portals/portal2.mdl") {
      p2 = curr;
    }
  }
  local p1o = p1 ? p1.GetOrigin() : Vector();
  local p2o = p2 ? p2.GetOrigin() : Vector();
  local p1a = p1 ? p1.GetAngles() : Vector();
  local p2a = p2 ? p2.GetAngles() : Vector();
  printl("spec_goto_portals "+p1o.x+" "+p1o.y+" "+p1o.z+" "+p1a.x+" "+p1a.y+" "+p1a.z+" "+p2o.x+" "+p2o.y+" "+p2o.z+" "+p2a.x+" "+p2a.y+" "+p2a.z);

  // Report position and angles of nearest cube within 1024u
  local eyepos = GetPlayer().EyePosition();
  local cube = Entities.FindByClassnameNearest("prop_weighted_cube", eyepos, 1024.0);
  local monster = Entities.FindByClassnameNearest("prop_monster_box", eyepos, 1024.0);
  // Determine what's closer - a cube or a Frankenturret
  if (!cube) cube = monster;
  else if (monster && (cube.GetOrigin() - eyepos).LengthSqr() > (monster.GetOrigin() - eyepos).LengthSqr()) {
    cube = monster;
  }
  // Print the position and angles of the cube
  if (cube && cube.IsValid()) {
    local co = cube.GetOrigin();
    local ca = cube.GetAngles();
    printl("spec_goto_cube "+co.x+" "+co.y+" "+co.z+" "+ca.x+" "+ca.y+" "+ca.z);
  }

};

/**
 * Manages the position and angles of the spectator cube.
 *
 * This function only gets executed when spectating other runs. It creates
 * an unsimulated prop, which is then teleported to the given position and
 * angle vectors for simulating the spectated player's nearest cube.
 */
::__elSpectatorCube <- function (pos, ang) {
  // Find the named prop acting as the spectator's cube
  local cube = Entities.FindByName(null, "__elSpectatorCube");
  // If one could not be found, attempt to create it
  if (!cube) {
    // First, check if the model exists in the world to prevent crashes
    if (Entities.FindByModel(null, "models/props/metal_box.mdl")) {
      cube = CreateProp("prop_physics", pos, "models/props/metal_box.mdl", 0);
      cube.__KeyValueFromString("Targetname", "__elSpectatorCube");
      cube.SetAngles(ang.x, ang.y, ang.z);
    }
    return;
  }
  // Don't render any other cubes on the map
  EntFire("prop_weighted_cube", "DisableDraw");
  EntFire("prop_monster_box", "DisableDraw");
  // Set the cube's position and angles
  // These specific methods are used because they enable interpolation
  cube.SetAbsOrigin(pos);
  cube.__KeyValueFromString("angles", ang.x + " " + ang.y + " " + ang.z);
  // Find the closest cube to this one and use its model
  local nearest = Entities.FindByClassnameNearest("prop_weighted_cube", pos, 1024.0);
  local monster = Entities.FindByClassnameNearest("prop_monster_box", pos, 1024.0);
  // Determine what's closer - a cube or a Frankenturret
  if (!nearest) nearest = monster;
  else if (monster && (nearest.GetOrigin() - pos).LengthSqr() > (monster.GetOrigin() - pos).LengthSqr()) {
    nearest = monster;
  }
  // Set the respective model
  if (nearest && nearest.IsValid()) {
    cube.SetModel(nearest.GetModelName());
  }
};

// Run the entrypoint function as soon as entity I/O kicks in
EntFireByHandle(Entities.First(), "RunScriptCode", "::__elInit()", 0.0, null, null);
