let input = "";

onConsoleOutput(function (data) {

  input += data.toString();

  const lines = input.split("\n");
  input = lines.pop();

  for (let i = 0; i < lines.length; i ++) {
    if (lines[i].startsWith("[SendToConsole] ")) {
      SendToConsole(lines[i].slice(16));
    }
  }

});

log.appendl("SendToConsole relay enabled!");
