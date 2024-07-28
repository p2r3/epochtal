const UtilError = require("./error.js");

// The strings below are encoded into Uint8Arrays
const encoder = new TextEncoder();

// We inject this string into the entity lump to have the co-op script run at the start of the map
const injectedEntity = encoder.encode(`"}{\nclassname logic_script\nvscripts debug_scripts/mp_coop_transition_list}{"`, "ascii");

// To find the start of the entity lump without parsing headers, we look for where the worldspawn entity is defined
const worldspawnPattern = encoder.encode(`\n"classname" "worldspawn"\n`, "ascii");

// To make space for the above change without changing lump offsets, we remove unnecessary newlines from the entity lump
const targetPattern = encoder.encode(`"\n}\n{\n"`, "ascii");
const replacePattern = encoder.encode(`"}{"`, "ascii");

// We need to perform exactly 23 such pattern replacements to make enough space for the injection
const REPLACE_COUNT = 23;

/**
 * Find a pattern within an array.
 * Unfortunately, TypedArrays don't have a native pattern matching method
 *
 * @param {string[]} array The array to search
 * @param {string} pattern The pattern to search for
 * @param {number} index The index to start searching from
 *
 * @returns {number} The index of the pattern in the array, or -1 if not found
 */
function findPattern (array, pattern, index = 0) {

  // Iterate through the array to find the pattern
  for (let i = index; i <= array.length - pattern.length; i ++) {

    // Check if pattern matches the subarray starting at index i
    let found = true;
    for (let j = 0; j < pattern.length; j++) {
      if (array[i + j] !== pattern[j]) {
        found = false;
        break;
      }
    }

    if (found) return i;

  }

  return -1;

}

/**
 * Handles the `coopifier` utility call. This utility is used to modify maps for co-op play.
 *
 * The following subcommands are available:
 * - `inject`: Inject the co-op script into the in `args[1]` specified .bsp file.
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, filename] = args;

  switch (command) {

    case "inject": {

      // Ensure a filename is provided
      if (!filename) throw new UtilError("ERR_FILE", args, context);

      const file = Bun.file(filename);
      if (file.size === 0) throw new UtilError("ERR_FILE", args, context);

      // Read the file as a Uint8Array
      let fileBytes = await file.bytes();

      // Find the position of the worldspawn string
      let index = findPattern(fileBytes, worldspawnPattern);
      if (index === -1) {
        throw new UtilError("ERR_WORLDSPAWN", args, context);
      }

      // Find and replace REPLACE_COUNT occurrences of targetPattern with replacePattern
      let replaced = 0;

      while (replaced < REPLACE_COUNT && index !== -1) {

        index = findPattern(fileBytes, targetPattern, index + targetPattern.length);
        if (index === -1) break;

        // Replace the pattern and move everything back, slowly making space
        fileBytes.set(replacePattern, index);
        fileBytes.copyWithin(index + replacePattern.length, index + targetPattern.length);
        replaced ++;

      }

      // Quick sanity check
      if (replaced !== REPLACE_COUNT) {
        throw new UtilError("ERR_REPLACE_COUNT", args, context);
      }

      // Find the next instance of targetPattern
      index = findPattern(fileBytes, targetPattern, index + targetPattern.length);
      // This time, shift everything to the right and insert injectedEntity
      fileBytes.copyWithin(index + injectedEntity.length, index + targetPattern.length);
      fileBytes.set(injectedEntity, index);

      // Replace the input file's contents with the modified buffer
      Bun.write(file, fileBytes);

      // Just to be safe, get rid of references to the buffer and run garbage collection
      fileBytes = null;
      Bun.gc(true);

      return "SUCCESS";

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
