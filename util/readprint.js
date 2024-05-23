const printFile = Bun.file(`${__dirname}/../util.print`);

module.exports = async function UtilReadPrint (since, context = epochtal) {

  if (Array.isArray(since)) since = since.join(" ");
  since = new Date(since);

  const lines = (await printFile.text()).split("\n");

  let startLine = -1;
  for (startLine = 0; startLine < lines.length; startLine ++) {
   
    const curr = lines[startLine];
    if (!curr.startsWith("[") || !curr.endsWith("]")) continue;

    const timestamp = new Date(curr.split("[")[1].split("]")[0]);
    if (timestamp > since) break;

  }

  return lines.slice(startLine).join("\n");

};
