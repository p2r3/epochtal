const { readdirSync } = require("node:fs");

/**
 * Handles the `help` utility call. Outputs usage information about the given command.
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {string} The output of the call
 */
module.exports = async function (args, context) {

  const [util] = args;

  switch (util) {

    case "system":
      return (
`Usage: system COMMAND [time]

Commands:
    restart -- restarts epochtal
    shutdown -- shuts down epochtal (note: can only be restarted via SSH)

Time is provided in seconds, 3 by default.
`);

    case "leaderboard":
      return (
`Usage: leaderboard COMMAND CATEGORY

Commands:
    list -- lists all categories with leaderboards
    get -- lists all runs in the given category
    remove STEAMID PURGE -- removes a player's run from the given category
        PURGE -- boolean flag - whether to purge the run from the weeklog
    add STEAMID TIME NOTE [PORTALS SEGMENTED] -- adds a run to the given category
        STEAMID -- player's steamid
        TIME -- run time in ticks
        NOTE -- player's comments
        PORTALS -- run portal count
        SEGMENTED -- boolean flag - is the run segmented
`);

    case "points":
      return (
`Usage: points COMMAND

Commands:
    calculate -- displays the potential point distribution for this week
    award -- adds the calculated points to user profiles
    revoke -- subtracts the calculated points from user profiles
`);

    case "gamefiles":
      return (
`Usage: gamefiles COMMAND

Commands:
    build -- builds a full portal2 dir, outputs map paths and a temp path to the directory it built
    getsar -- downloads the latest sar pre for win/linux and outputs temp paths
    getmap MAPID -- downloads the given map and outputs a temp path along with the bsp path and name
    getvmf PATH -- decompiles a bsp from the given path and returns a temp path to the output vmf
`);

    case "demo":
      return (
`Usage: demo COMMAND PATH

Commands:
    dump -- returns data extracted from a full UntitledParser demo dump
    mdp -- returns the full mdp-json output for the given demo
    parse -- returns a leaderboard-format parse of the demo data
    verify -- checks the legality of the given demo
`);

    case "flush":
      return (
`Usage: flush COMMAND

Commands:
    memory -- flushes data to memory from disk
    disk -- flushes data to disk from memory
`);

    case "archive":
      return (
`Usage: archive COMMAND NAME

Commands:
    get -- creates a context from the given archive and returns it
    assume UTIL [ARGS...] -- runs a utility by assuming an archive's context
    create -- archives the current context (demos are moved, all else stays)
    list -- lists all available archives
`);

    case "log":
      return (
`Usage: log COMMAND

Commands:
    read -- parses the compact log file
    remove TIMESTAMP -- removes a log entry entirely
    add STEAMID CATEGORY TIME PORTALS [TIMESTAMP] -- appends a log entry
        STEAMID -- player's steamid
        CATEGORY -- codename of category
        TIME -- run time in ticks
        PORTALS -- run portal count
        TIMESTAMP -- time of submission in seconds since start of week
    reconstruct -- builds a leaderboard from the log file
`);

    case "help":
      return (
`Usage: help COMMAND

Outputs usage information about the given command.
`);

    case "tmppath":
      return (
`Usage: tmppath [LENGTH]

Outputs a randomly generated, unoccupied path.
`);

    case "coopify":
      return (
`Usage: coopify [PATH]

Injects the co-op script into a bsp. The file is modified in-place.
The return value is either true or false depending on whether or not the operation succeeded.
`);

    case "votes":
      return (
`Usage: votes COMMAND STEAMID

Commands:
    get -- list votes for the given user
    upvote MAP -- upvote the map with the given index
    downvote MAP -- downvote the map with the given index
    reset MAP -- clear user's vote for the map with the given index
`);

    case "categories":
      return (
`Usage: categories COMMAND

Commands:
    list -- list names of all available categories
    get NAME -- display properties for the given category
    getall -- display properties all available categories
    remove NAME -- remove the given category
    add NAME TITLE PORTALS COOP LOCK PROOF POINTS [SLOT] -- create a new category
        NAME -- category codename
        TITLE -- category display name
        PORTALS -- boolean, do portals matter?
        COOP -- boolean, is it a co-op category?
        LOCK -- boolean, is it locked by default?
        PROOF -- either "demo", "video", or "any"
        POINTS -- boolean, should points be awarded?
        SLOT -- index in lists, appends to end by default
    edit NAME KEY VALUE -- edit some category property
        NAME -- category codename
        KEY -- name of property to edit
        VALUE -- new value of the given property
`);

    case "routine":
      return (
`Usage: routine COMMAND ROUTINE FUNCTION

Commands:
    run -- perform the given routine
    schedule TIME -- schedule the given routine to run regularly
        TIME -- a space-delimited string of numbers in the following order:
          second (0 - 59)
          minute (0 - 59)
          hour (0 - 23)
          day of month (1 - 31)
          month (1 - 12)
          day of week (0 - 7) (0 or 7 is Sun)
`);

    case "print":
      return (
`Usage: print MESSAGE

Prints the given message to the utility print log.
`);

    case "discord":
      return (
`Usage: discord COMMAND MESSAGE

Commands:
    announce -- send the given message to the main tournament channel
    report -- send the given message to the reports channel
`);

    case "config":
      return (
`Usage: config COMMAND

Commands:
    get [FIELD] -- get the value of a config property
        FIELD -- the property to return, omit to return all
    edit FIELD VALUE -- set a property of the config
        FIELD -- the property to edit
        VALUE -- the new value of the given property
    fixdate -- set the "date" property to the start of the week
`);

    case "workshopper":
      return (
`Usage: workshopper COMMAND

Commands:
    get MAPID -- returns workshop data about the given map
    curate MAPID -- returns the curation value of the given map in points
    buildweek [APPEND] -- curates a week's worth of maps and returns their points
        APPEND -- an array of pre-curated maps to append before sorting
`);

    case "users":
      return (
`Usage: users COMMAND

Commands:
    list -- lists all user information
    find NAME -- searches for users by username
    get STEAMID -- returns information about a specific user
    add STEAMID NAME -- adds a new user to the database
    ban STEAMID TIME -- bans the user for the given amount of time in seconds
    remove STEAMID -- delete user data
    edit STEAMID KEY VALUE -- directly edit user properties
`);

    case "spplice":
      return (
`Usage: spplice COMMAND

Commands:
    archive PORTAL2 -- creates a tar.xz archive of the given game files, returns a path to it
        PORTAL2 -- path to game file directory
    package PORTAL2 MANIFEST -- creates an sppkg package, returns a path to it
        PORTAL2 -- path to game file directory
        MANIFEST -- path to spplice json manifest file
    manifest [PACKAGES] -- creates a spplice package manifest file, returns a path to it
        PACKAGES -- optionally, you can provide a custom packages array
`);

  }

  // List all available utilities if no valid utility name is provided
  const files = readdirSync(__dirname);
  const list = [];

  for (let i = 0; i < files.length; i ++) {
    if (!files[i].endsWith(".js")) continue;
    list.push(files[i].slice(0, -3));
  }

  return "Available utilities: " + list.join(", ");

};