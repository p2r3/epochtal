function ticksToString (t) {

  let output = "",
      hrs = Math.floor(t / 216000)
      min = Math.floor(t / 3600),
      sec = t % 3600 / 60;

  if (hrs !== 0) output += `${hrs}:${min % 60 < 10 ? "0" : ""}${min % 60}:`;
  else if (min !== 0) output += `${min}:`;
  if (sec < 10) output += "0";
  output += sec.toFixed(3);

  return output;

}

function ticksToStringArray (t) {

  let sec = t % 3600 / 60;
  const min = Math.floor(t / 3600).toString();
  const ms = (sec % 1).toFixed(3).slice(2);

  sec = (sec < 10 ? "0" : "") + Math.floor(sec).toString();

  return [min, sec, ms];

}

function stringArrayToTicks (a) {

  a[0] = Math.abs(Number(a[0]));
  a[1] = Math.abs(Number(a[1]));
  a[2] = Math.abs(Number(a[2]));
  
  return Math.round(a[0] * 3600 + a[1] * 60 + a[2] * 0.06);

}

function stringToTicks (str) {

  const arr = str.replace(/:/g, ".").replace(/,/g, ".").split(".");

  return stringArrayToTicks(arr);

}

function toHTMLString (str) {
  return str.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
