// Report time in 60 TPS
const TICKRATE = 0.0166667;

// Expect server environment
if (!("Entities" in this)) return;

// Prints the current server time (in ticks) to the console
::__elPrintTime <- function () {
  // Round to nearest integer in case of float division errors
  local ticks = floor(Time() / TICKRATE + 0.5).tointeger();
  printl("[elServerTime] " + ticks);
};

// Hooks the PTI level end relay to signal map finish event to console
::__elHookPTI <- function (relay) {

  if (!relay.ValidateScriptScope()) return;
  local scope = relay.GetScriptScope();

  // Print the current server time and map finish event
  local hookFunc = function () {
    ::__elPrintTime();
    printl("[elMapFinished]");
  };

  // Hooks are case sensitive, attach to both common options
  scope.InputTrigger <- hookFunc;
  scope.Inputtrigger <- hookFunc;

  return true;

};

// Run the hook setup function once the relay becomes available
EntFire("@relay_pti_level_end", "RunScriptCode", "::__elHookPTI(self)");
