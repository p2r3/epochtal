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

// This runs __elSetup as soon as the level finishes loading
local auto = Entities.CreateByClassname("logic_auto");
auto.ConnectOutput("OnNewGame", "__elSetup");

// Connect outputs to run finish events
EntFire("@relay_pti_level_end", "AddOutput", "OnTrigger !self:RunScriptCode:__elFinish():0:1");
