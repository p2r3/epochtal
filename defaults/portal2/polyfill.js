/**
 * This file provides polyfilled implementations of spplice-cpp features.
 * Spplice 2's JS API is mostly asynchronous, whereas spplice-cpp's API
 * features thread-blocking functions exclusively, with no async support
 * due to the runtime being only ES5 compliant.
 *
 * However, because of some fundamental differences in the JS environments,
 * we also need to modify the original main.js script. These modifications
 * are mostly find-and-replace operations for making some functions
 * asynchronous, which assume very little about the code being modified.
 *
 * Ideally, this would all be deprecated ASAP anyway.
 */

// Save everything received by the console to the buffer
let __pfConsoleData = "";
onConsoleOutput(data => __pfConsoleData += data);

// Redirect console output to the Spplice 2 progress log
var console = {
  log (...args) {
    args.forEach(arg => log.append(arg));
  },
  error (...args) {
    args.forEach(arg => log.error(arg));
  }
};

var game = {
  // Spplice 2 connects before starting the JS interface, so this is a dummy function
  connect () {
    return 1;
  },
  // Treat the console data string as a FIFO buffer
  read (_, n = 1024) {
    const out = __pfConsoleData.slice(0, n);
    __pfConsoleData = __pfConsoleData.slice(n);
    return out;
  },
  // Basically an alias for SendToConsole, but removes extra \n if any
  send (_, d) {
    if (d[d.length - 1] === "\n") d = d.slice(0, -1);
    SendToConsole(d);
  }
};

// Store WebSockets in an array, up to 32 at a time
const __pfWebSocketList = [];
const __pfWebSocketMax = 32;

// Imitate a spplice-cpp WebSocket, with a FIFO message buffer and "closed" state
class __pfWebSocket {

  socket = null;
  buffer = [];
  closed = false;
  opened = false;

  constructor (url, resolve) {
    this.socket = new WebSocket(url);
    // Push all messages to the buffer
    this.socket.addEventListener("message", msg => this.buffer.push(msg.data));
    // Resolve the promise with "true" on connection success
    this.socket.onopen = () => {
      if (!this.closed) resolve(true);
      this.opened = true;
    }
    // On connection failure, resolve with "false" (if relevant) and set closed state
    this.socket.onerror = this.socket.onclose = () => {
      if (!this.opened) resolve(false);
      this.closed = true;
      this.socket.onclose = undefined;
      this.socket.onerror = undefined;
    };
  }

}

var ws = {
  // Synchronously connect to the socket, return ID on success or null/throw on failure
  async connect (url) {
    for (let i = 0; i < __pfWebSocketMax; i ++) {
      if (__pfWebSocketList[i] !== undefined) continue;

      const success = await new Promise(function (resolve) {
        __pfWebSocketList[i] = new __pfWebSocket(url, resolve);
      });

      if (!success) {
        __pfWebSocketList[i] = undefined;
        return null;
      }
      return i + 1;
    }
    throw "ws.connect: Too many WebSocket connections";
  },
  // Close the socket, remove it from the list
  disconnect (s) {
    __pfWebSocketList[s - 1].socket.close();
    __pfWebSocketList[s - 1] = undefined;
  },
  // Send the given message, return false if socket is no longer open
  send (s, m) {
    if (__pfWebSocketList[s - 1].closed) return false;
    __pfWebSocketList[s - 1].socket.send(m);
    return true;
  },
  // Treat the socket output as a FIFO structure
  read (s, n = 1024) {
    if (__pfWebSocketList[s - 1].buffer.length === 0) return "";
    return __pfWebSocketList[s - 1].buffer.shift();
  }
};

var download = {
  // Fetch text, return empty string on failure
  async string (url) {
    try { return await (await fetch(url)).text() }
    catch (e) { return "" }
  },
  // Fetch file, throw error on failure
  async file (path, url) {
    let taken = true;
    try { fs.rename(path, path) }
    catch (e) { taken = false }
    if (taken) throw "download.file: Path already occupied";

    try {
      const buffer = Buffer.from(await (await fetch(url)).arrayBuffer());
      fs.write(path, buffer);
    } catch (e) {
      throw "download.file: Download failed";
    }
  }
};

// This is where we modify the main.js file. We don't actually write it
// out or anything, it gets read into a string and then eval-ed from there.
let __pfMain = fs.read("main.js");

// Start a new block to make use of temporary constants
{
  // List of words to replace in input/output pairs
  const replaceList = [
    ["ws.connect", "await ws.connect"], // Treat ws.connect as an awaited promise
    ["download.string", "await download.string"], // Treat download.string as an awaited promise
    ["download.file", "await download.file"], // Treat download.file as an awaited promise
    ["sleep", "await sleep"] // Await all sleep() calls
  ];

  // Temporarily substitute all strings to avoid tampering with those
  const replacedStrings = [];
  let stridx = 0;

  while ((stridx = Math.min(__pfMain.indexOf('"', stridx), __pfMain.indexOf("'", stridx))) !== -1) {

    // Store the character that started the string for reference
    const stringChar = __pfMain[stridx];

    // Look for a matching character that terminates the string
    // Since the input is ES5, we don't have to parse template literals
    let strend = stridx;
    while (++strend < __pfMain.length) {
      // There are no multiline strings in ES5, abort!!
      if (__pfMain[strend] === "\n") break;
      // Search for a string terminator of the same type
      if (__pfMain[strend] !== stringChar) continue;
      // Count the amount of backslashes
      let escapes = 0;
      while (__pfMain[strend - escapes - 1] === "\\") escapes ++;
      // If it's an odd number, the terminator is escaped, keep looking
      if (escapes % 2 === 1) continue;
      // Otherwise, we've found it
      break;
    }

    // Make sure we didn't break from the loop early
    if (__pfMain[strend] === stringChar) {
      replacedStrings.push(__pfMain.slice(stridx, strend + 1));
      __pfMain = __pfMain.slice(0, stridx) + "__pfReplacedString" + __pfMain.slice(strend + 1);
      // Offset new end index by replaced string length minus the length of the placeholder
      strend -= (strend - stridx - 1) - 18;
    }

    stridx = strend + 1;

  }

  // Replace the first element of each pair with the second
  replaceList.forEach(function (pair) {

    // Ensure we only match whole words (not part of larger variable names)
    const regex = new RegExp("(?<![a-zA-Z0-9_$])" + pair[0] + "(?![a-zA-Z0-9_$])", "g");
    __pfMain = __pfMain.replace(regex, pair[1]);

  });

  // Find all named functions defined in the code
  const funtionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  const functionNames = [];

  let match;
  while ((match = funtionRegex.exec(__pfMain)) !== null) {
    functionNames.push(match[1]);
  }

  // For each function name, prepend async before its declaration and await before its calls
  functionNames.forEach(function (name) {

    // Match function declarations and calls, separated based on the "function" keyword
    const regex = new RegExp(`(?<![a-zA-Z0-9_$])(function\\s+)?(${name})(?![a-zA-Z0-9_$])`, "g");

    __pfMain = __pfMain.replace(regex, function (match, declaration, invocation) {
      // If the name is prefixed by "function", add "async"
      if (declaration) return "async " + match;
      // Otherwise, add "await"
      return "await " + invocation;
    });

  });

  // Restore all replaced strings
  __pfMain = __pfMain.replaceAll("__pfReplacedString", function () {
    return replacedStrings.shift();
  });

  // Wrap everything in an async function to allow for top-level await
  __pfMain = `(async function () {\n${__pfMain}\n})().catch(e => log.error(e))`;

}

// Execute the modified script
eval(__pfMain);
// Throw to prevent continuing down to the original main.js file
throw { message: "Polyfilled script started. This is not an error." };
