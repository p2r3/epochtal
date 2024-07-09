let input = "";
let pongIgnore = 0;

onConsoleOutput(function (data) {

  input += data.toString().replaceAll("\r", "");

  const lines = input.split("\n");
  input = lines.pop();

  for (let i = 0; i < lines.length; i ++) {

    if (lines[i].startsWith("[SendToConsole] ")) {
      SendToConsole(lines[i].slice(16));
      continue;
    }

    if (lines[i].includes("[coop_portal_ping]")) {
      
      SendToConsole("hud_saytext_time 0;say [coop_portal_pong]");
      pongIgnore = 2;
      
      continue;
    }

    if (lines[i].includes("[coop_portal_pong]")) {
      
      if (pongIgnore > 0) {
        pongIgnore --;
        continue;
      }
      pongIgnore = 1;

      SendToConsole("script ::coopUpdatePortals()");

      continue;
    }

  }

});

log.appendl("SendToConsole relay enabled!");
