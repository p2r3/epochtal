/**
 * Converts demo ticks to a string representation
 *
 * @param {number} t The number of ticks
 * @returns {string} The formatted string
 */
function ticksToString (t) {

    // Split the ticks into hours, minutes, and seconds
    let output = "";
    const hrs = Math.floor(t / 216000),
        min = Math.floor(t / 3600),
        sec = t % 3600 / 60;

    // Format the output string
    if (hrs !== 0) output += `${hrs}:${min % 60 < 10 ? "0" : ""}${min % 60}:`;
    else if (min !== 0) output += `${min}:`;
    if (sec < 10) output += "0";
    output += sec.toFixed(3);

    return output;

}

/**
 * Parses a profilelog buffer into an array of objects
 *
 * @param {Uint8Array|Array} buffer Buffer containing profilelog data
 * @param {string[]} categoryList List of categories
 * @returns {object[]} Array of objects representing profilelog entries
 */
function decodeProfileLog (buffer, categoryList) {

    const log = [];

    // each entry is 10 bytes long
    for (let i = 0; i < buffer.length; i += 10) {

        const entry = {};

        // 1 byte - category index
        entry.category = categoryList[buffer[i]];

        // 4 bytes - run time in ticks
        entry.time = 0;
        for (let j = 0; j < 4; j ++) {
            entry.time += buffer[i + 1 + j] * Math.pow(256, 3 - j);
        }

        // 1 byte - portal count
        entry.portals = buffer[i + 5];

        // 4 bytes - seconds since start of week 0
        entry.timestamp = 0;
        for (let j = 0; j < 4; j ++) {
            entry.timestamp += buffer[i + 6 + j] * Math.pow(256, 3 - j);
        }

        log.push(entry);

    }

    return log;

}


if(typeof global === "object") {
    module.exports = { ticksToString, decodeProfileLog };
}