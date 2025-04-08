// Ensure we're running on the server's script scope
if (!("Entities" in this)) return;

// Called shortly after the level has started loading
::__elSetup <- function () {
  // Make some saves to prevent accidentally loading into a different map
  SendToConsole("save quick");
  SendToConsole("save autosave");
};

// Called when the map end condition is reached
::__elFinish <- function () {
  // Print run end signature
  printl("elFinish");
};

// Called 15 times a second (every other logical tick)
::__elTick <- function () {
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

// Manages the position and angles of the spectator cube
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

// This runs __elSetup as soon as the level finishes loading
local auto = Entities.CreateByClassname("logic_auto");
auto.ConnectOutput("OnNewGame", "__elSetup");

// This runs __elTick on every other logical tick
local timer = Entities.CreateByClassname("logic_timer");
EntFireByHandle(timer, "RefireTime", "0.0667", 0.0, null, null);
EntFireByHandle(timer, "Enable", "", 0.0, null, null);
timer.ConnectOutput("OnTimer", "__elTick");

// Connect outputs to run finish events
EntFire("@relay_pti_level_end", "AddOutput", "OnTrigger !self:RunScriptCode:__elFinish():0:1");
