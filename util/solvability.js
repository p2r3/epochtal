const UtilError = require("./error.js");

const curator = require("./curator.js");

/**
 * Creates an array of all connections that can be directly fired from a given entity upon
 * receiving an output from a given list.
 * Each connection is given as `[targetQuery, input, value, delay, timesToFire]`, the first
 * three of which are normalized to lowercase strings.
 *
 * @param {object} entity Entity whose outputs are being checked
 * @param {string[]} outputs Names of the outputs that are being checked
 * @returns {string[][]} Array of connections, where each connection is a five-element array beginning with three lowercase strings
 */
function iterableOfConnectionsFromEntityOutputs (entity, outputs) {

  // Ensure this entity's table of outputs is valid
  if (entity.outputs == null || typeof entity.outputs !== "object") return [];

  const connections = [];
  for (const output of outputs) {

    if (!Array.isArray(entity.outputs[output])) continue;
    // Iterate over all connections for this output
    for (const connection of entity.outputs[output]) {

      if (!Array.isArray(connection)) continue;

      // Standardize this connection to contain five components [targetQuery, input, value, delay, timesToFire]
      const standardizedConnection = connection.slice(0, 5);
      while (standardizedConnection.length < 5) standardizedConnection.push("");

      // Standardize the first three arguments of this connection to contain lowercase strings
      for (let i = 0; i < 3; i++)
        standardizedConnection[i] = String(standardizedConnection[i] ?? "").toLowerCase();

      connections.push(standardizedConnection);
    }
  }
  return connections;

}

/**
 * Finds all entities that match a given target query from a given entity.
 * Uses a cached value if this target query has already been resolved.
 *
 * @param {string} targetQuery Target query to resolve
 * @param {object} entity Entity that is making the target query
 * @param {object[]} entities List of all entities to search through
 * @param {Map<string, object[]>} entitiesFromTargetQueryCache Cache that maps target queries that have already been resolved to the entities that match them
 * @returns {object[]} List of entities matching the target query
 */
function applyTargetQuery (targetQuery, entity, entities, entitiesFromTargetQueryCache = new Map()) {

  targetQuery = (targetQuery ?? "").toLowerCase();

  // The entities referred to by !activator and !caller depend on the input-output chain,
  // so assume they can refer to any entity
  if (targetQuery === "!activator" || targetQuery === "!caller") return entities;
  // !self makes the entity target only itself
  else if (targetQuery === "!self") return [entity];

  // If the entities of this target query have already been found, use the cached result
  if (entitiesFromTargetQueryCache.get(targetQuery) !== undefined)
    return entitiesFromTargetQueryCache.get(targetQuery);

  // Loop over all entities to see which ones match the target query
  const targetEntities = [];
  for (const targetEntity of entities) {

    // Filter out entities that don't match the target query
    // The target query can match either the targetname or classname

    const tgName = (targetEntity.targetname ?? "").toLowerCase();
    const clsName = (targetEntity.classname ?? "").toLowerCase();

    let satisfiesTargetQuery;
    // If a wildcard (*) is used, only the prefix is required to match - all characters
    // after the wildcard are ignored
    if (targetQuery.includes("*")) {
      const index = targetQuery.indexOf("*");
      const prefix = targetQuery.slice(0, index);
      satisfiesTargetQuery = (tgName.startsWith(prefix) || clsName.startsWith(prefix));
    }
    else satisfiesTargetQuery = (tgName === targetQuery || clsName === targetQuery);
    if (!satisfiesTargetQuery) continue;


    // Add this target entity to the list of entities that match this target query
    targetEntities.push(targetEntity);
  }

  // Cache the result of this target query, and return it
  entitiesFromTargetQueryCache.set(targetQuery, targetEntities);
  return targetEntities;

}

/**
 * Finds all entity-input-values that can be fired by an input-output chain that starts
 * from a given entity and a list of outputs.
 * Where we are unsure whether an output can be fired, it is assumed that it can be.
 *
 * @param {object} entity Entity whose outputs are being traced
 * @param {string[]} outputs Names of the outputs that are being traced
 * @param {object[]} entities List of all entities to search through
 * @param {Set<object>} entitiesThatArePermanentlyDisabled Set of entities that are permanently disabled and therefore cannot fire outputs from inputs other than 'FireUser[X]'
 * @param {Map<string, object[]>} [entitiesFromTargetQueryCache] Cache that maps target queries that have already been resolved to the entities that match them
 * @param {boolean} [useValuesAtMapSpawn] If true, assumes the value of any logic_branch is its start-of-map value when determining which outputs fire
 * @param {Array<{entity: object, input: string, value: string}>} [reachableEntityInputs] List of reachable entity-input-values, to be filled during recursive calls
 * @param {Map<object, Set<string>>} [visitedEntityInputs] Tracks which entity-input-values have already been traced
 * @returns {Array<{entity: object, input: string, value: string}>} List of entity-input-values reachable from the given outputs of the given entity
 */
function traceConnections (entity, outputs, entities, entitiesThatArePermanentlyDisabled, entitiesFromTargetQueryCache = new Map(), useValuesAtMapSpawn = false, reachableEntityInputs = [], visitedEntityInputs = new Map()) {

  // Iterate over all connections from this entity with these outputs
  for (const [targetQuery, input, value] of iterableOfConnectionsFromEntityOutputs(entity, outputs)) {
    // Iterate over all entities targeted by this connection
    for (const targetEntity of applyTargetQuery(targetQuery, entity, entities, entitiesFromTargetQueryCache)) {

      // Skip recursing into the same entity with the same input and value
      const visitKey = input + "\0" + value;
      if (visitedEntityInputs.get(targetEntity) === undefined) visitedEntityInputs.set(targetEntity, new Set());
      if (visitedEntityInputs.get(targetEntity).has(visitKey)) continue;
      visitedEntityInputs.get(targetEntity).add(visitKey);

      // Add this entity-input-value to the list of reachable ones
      reachableEntityInputs.push({ entity: targetEntity, input: input, value: value });

      // See what outputs can be fired as a result of receiving this input
      // The mappings from an input to outputs depend on the classname of the target entity

      let targetOutputs = [];

      // For all entities, the input 'FireUser[X]' maps to the output 'OnUser[X]'
      if (input.startsWith("fireuser")) {
        const index = input.slice("fireuser".length);
        targetOutputs = ["onuser" + index];
      }
      // If the entity is disabled, 'FireUser[X]' is the only input that can cause an output to fire, and that
      // was handled above
      else if (entitiesThatArePermanentlyDisabled.has(targetEntity)) continue;
      // For all entities, these inputs can't fire any outputs
      else if (["enableportalfunnel", "becomemonster", "kill", "exitdisabledstate", "selfdestructimmediately", "explode"].includes(input))
        targetOutputs = [];
      // For all entities, the inputs 'Dissolve' and 'SilentDissolve' can fire no output other than 'OnFizzled'
      // (some entities can't even fire that)
      else if (["dissolve", "silentdissolve"].includes(input))
        targetOutputs = ["onfizzled"];
      // For all entities, the input 'Disable' can fire no output other than 'OnDisable' and 'OnDisabled' (some
      // entities can't even fire either of those)
      else if (input === "disable")
        targetOutputs = ["ondisable", "ondisabled"];
      // For other inputs, use the input-output behavior of this entity's class
      else switch (targetEntity.classname) {
        // Logic relays map 'Trigger' to 'OnTrigger', and 'TriggerWithParameter' to 'OnTriggerParameter'
        case "logic_relay":
          if (input === "trigger")
            targetOutputs = ["ontrigger"];
          else if (input === "triggerwithparameter")
            targetOutputs = ["ontriggerparameter"];
          break;
        // Proxies map 'ProxyRelay[x]' to 'OnProxyRelay[x]', and 'OnProxyRelay[x]' to 'OnProxyRelay[x]'
        case "func_instance_io_proxy":
          if (input.startsWith("proxyrelay")) {
            const index = input.slice("proxyrelay".length);
            targetOutputs = ["onproxyrelay" + index];
          }
          if (input.startsWith("onproxyrelay")) {
            targetOutputs = [input];
          }
          break;
        case "math_counter":
          if (["add", "divide", "multiply", "setvalue", "subtract", "sethitmax", "sethitmin"].includes(input))
            targetOutputs = ["outvalue", "onhitmin", "onhitmax", "onchangedfrommin", "onchangedfrommax"];
          else if (["setminvaluenofire", "setmaxvaluenofire"].includes(input))
            targetOutputs = ["onhitmin", "onhitmax", "onchangedfrommin", "onchangedfrommax"];
          else if (input === "getvalue")
            targetOutputs = ["ongetvalue"];
          break;
        case "trigger_once":
          if (input === "starttouch")
            targetOutputs = ["onstarttouch", "ontrigger"];
          break;
        case "trigger_multiple":
          if (input === "touchtest")
            targetOutputs = ["ontouching", "onnottouching"];
          else if (input === "starttouch")
            targetOutputs = ["onentireteamstarttouch", "ontrigger", "onstarttouch", "onstarttouchall"];
          else if (["endtouch", "disableandendtouch"].includes(input))
            targetOutputs = ["onentireteamendtouch", "onendtouch", "onendtouchall"];
          break;
        case "prop_testchamber_door":
          if (input === "open" || input === "lockopen")
            targetOutputs = ["onopen", "onfullyopen"];
          else if (input === "close")
            targetOutputs = ["onclose", "onfullyclose"];
          break;
        case "logic_coop_manager":
          if (input === "setstateatrue" || input === "setstatebtrue")
            targetOutputs = ["onchangetoalltrue", "onchangetoanytrue"];
          else if (input === "setstateafalse" || input === "setstatebfalse")
            targetOutputs = ["onchangetoallfalse", "onchangetoanyfalse"];
          else if (input === "togglestatea" || input === "togglestateb")
            targetOutputs = ["onchangetoalltrue", "onchangetoanytrue", "onchangetoallfalse", "onchangetoanyfalse"];
          break;
        case "logic_compare":
          if (input === "setvaluecompare" || input === "compare")
            targetOutputs = ["onlessthan", "onequalto", "onnotequalto", "ongreaterthan"];
          break;
        case "logic_multicompare":
          if (input === "comparevalues")
            targetOutputs = ["onequal", "onnotequal"];
          break;
        // Logic cases can fire 'OnDefault' or any of 'OnCase01', 'OnCase02', ..., 'OnCase16'
        case "logic_case":
          if (["invalue", "pickrandom", "pickrandomshuffle"].includes(input)) {
            targetOutputs = [
              ...Array.from({ length: 16 }, (_, i) => `oncase${String(i + 1).padStart(2, "0")}`),
              "ondefault"
            ];
          }
          break;
        case "logic_branch":
          // When a logic branch fires 'Test', its value determines what output is fired - if we are assuming
          // that its value is its start-of-map value, then use its initial value
          if (input === "test") {
            if (useValuesAtMapSpawn)
              targetOutputs = targetEntity.initialvalue == 1 ? ["ontrue"] : ["onfalse"];
            else
              targetOutputs = ["ontrue", "onfalse"];
          }
          // If the logic branch fires 'ToggleTest', don't use any assumption that its value is at its
          // start-of-map value
          else if (input === "toggletest") {
            targetOutputs = ["ontrue", "onfalse"];
          }
          else if (input === "setvaluetest") {
            if (value == "1") targetOutputs = ["ontrue"];
            else if (value == "0") targetOutputs = ["onfalse"];
            else targetOutputs = ["ontrue", "onfalse"];
          }
          break;
        // No input can cause a logic_auto to fire an output, apart from generic inputs which have already been
        // handled for all entities
        case "logic_auto":
          targetOutputs = [];
          break;
        // For all other cases, assume all the entity's outputs can be fired
        // This makes sure we trace all possible connections
        default:
          targetOutputs = Object.keys(targetEntity.outputs ?? {});
          break;
      }
      // Continue tracing from these outputs, mutating reachableEntityInputs to add any additional
      // entity-input-values reached
      if (targetOutputs.length) traceConnections(targetEntity, targetOutputs, entities, entitiesThatArePermanentlyDisabled, entitiesFromTargetQueryCache, useValuesAtMapSpawn, reachableEntityInputs, visitedEntityInputs);
    }
  }
  // Return the list of entity-input-values reached
  return reachableEntityInputs;

}

/** @type {Set<string>|null} */
let everyPeTIEntityCache = null;

/**
 * Returns every (classname, targetname) pair that is possible in standard PeTI (with all
 * digits removed from targetnames for normalization).
 * 
 * The first time this function is called, it builds the set by reading `peti_entities.txt`
 * and stores it in `everyPeTIEntityCache`.
 * Any subsequent calls just return that cached set.
 * 
 * @returns {Promise<Set<string>>} Cached set of `${targetname}\0${classname}` representing the entities possible in standard PeTI
 */
async function getEveryPeTIEntity () {

  // If this function has been called before, the standard PeTI entities have already been
  // cached and we just return these cached values
  if (everyPeTIEntityCache != null) return everyPeTIEntityCache;

  // Read all standard PeTI entities from a file (in the file, numbers have already been
  // removed from targetnames)
  const text = await Bun.file(`${__dirname}/../defaults/peti_entities.txt`).text();
  const set = new Set();
  for (const line of text.split("\n")) {
    if (line.length === 0) continue;
    const [tgName, clsName=""] = line.split("\t");
    set.add(`${tgName}\0${clsName}`);
  }

  // Cache these standard PeTI entities, and return them
  everyPeTIEntityCache = set;
  return everyPeTIEntityCache;

}

/**
 * Removes all digit characters from a string.
 * Used to normalize PeTI entity targetnames.
 *
 * @param {string|null|undefined} s String from which to remove digits
 * @returns {string} `s` with every digit character removed, or "" if `s` is nullish
 */
const removeAllNumbers = (s) => (s ?? "").replace(/\d+/g, "");

/**
 * Determines whether a map was made with BEEmod (or is in any way non–standard PeTI), by checking whether
 * it contains any entity whose (targetname, classname) pair is not possible in standard PeTI.
 *
 * @param {object[]} entities Parsed entities from the map BSP's entities lump
 * @returns {Promise<boolean>} `true` if some entity's (targetname, classname) is not possible in standard PeTI, `false` otherwise
 */
async function checkWhetherBEEmod (entities) {

  const standardPeTIEntities = await getEveryPeTIEntity();
  return entities.some((e) => {
    // Some entities' targetnames can have instance-specific digit combinations, so we remove all digits from
    // targetnames when performing this check (aligning with the form in standardPeTIEntities) to allow matching.
    // e.g. barrierhazard1234567_modelStart1234567-proxy would be normalized to barrierhazard_modelStart-proxy
    const tn = removeAllNumbers(e.targetname);
    const cn = (e.classname ?? "");
    return !standardPeTIEntities.has(`${tn}\0${cn}`);
  });

}

/**
 * Returns the lower corner of the 128x128x128 block containing the given position.
 *
 * @param {{ x: number, y: number, z: number }|[number, number, number]} pos Position (as an object or array)
 * @returns {{ x: number, y: number, z: number }} Lower corner of the block containing the given position
 */
function findLowerCornerOfBlock (pos) {

  // Extract the x, y, z coordinates of pos, whether it is given as an array or an object
  const x = Array.isArray(pos) ? pos[0] : pos.x;
  const y = Array.isArray(pos) ? pos[1] : pos.y;
  const z = Array.isArray(pos) ? pos[2] : pos.z;
  // Find the lower corner of the block containing those coordinates
  // Ensure rounding up if we're basically at the edge of a block
  return {
    x: Math.floor((x + 1e-2) / 128) * 128,
    y: Math.floor((y + 1e-2) / 128) * 128,
    z: Math.floor((z + 1e-2) / 128) * 128
  };

}

/**
 * Finds the axis direction in which the entity is indented into its 128x128x128 block by
 * distance `indentDistance`, within tolerance.
 *
 * @param {{ x: number, y: number, z: number }|[number, number, number]} origin The location of the entity whose indent direction is being determined
 * @param {number} indentDistance The distance the entity is expected to be indented by in some axis direction
 * @returns {{ x: number, y: number, z: number }|null} Unit vector in the axis direction of the indent (one component +-1), or null if it is not indented by `indentDistance` in any axis direction
 */
function findIndentDirection (origin, indentDistance) {

  if (indentDistance <= 0) return null;

  const tol = 1e-2;
  const approxEquals = (a, b) => Math.abs(a - b) <= tol;

  // Extract the x, y, z coordinates of origin, whether it is given as an array or an object
  const x = Number(Array.isArray(origin) ? origin[0] : origin.x);
  const y = Number(Array.isArray(origin) ? origin[1] : origin.y);
  const z = Number(Array.isArray(origin) ? origin[2] : origin.z);

  // Find the indent into the next block in each direction, properly accounting for negative coordinates
  const mod128ReturnNonNegative = (c) => {
    const result = c % 128;
    return result >= 0 ? result : result + 128;
  };
  const xIndent = mod128ReturnNonNegative(x);
  const yIndent = mod128ReturnNonNegative(y);
  const zIndent = mod128ReturnNonNegative(z);

  // Find the direction that is indented into the next block by distance indentDistance
  if (approxEquals(xIndent, indentDistance))
    return { x: 1, y: 0, z: 0};
  if (approxEquals(xIndent, 128 - indentDistance))
    return { x: -1, y: 0, z: 0};
  if (approxEquals(yIndent, indentDistance))
    return { x: 0, y: 1, z: 0};
  if (approxEquals(yIndent, 128 - indentDistance))
    return { x: 0, y: -1, z: 0};
  if (approxEquals(zIndent, indentDistance))
    return { x: 0, y: 0, z: 1};
  if (approxEquals(zIndent, 128 - indentDistance))
    return { x: 0, y: 0, z: -1};
  // If no direction is indented into the next block by distance indentDistance, return null
  return null;

}

/**
 * Finds the 128x128x128 block reached by taking one step from the given
 * block opposite the given direction.
 * Used when finding the location in the puzzle where an entity effectively
 * is if it is indented into the wall in some direction.
 *
 * @param {{ x: number, y: number, z: number }} block Lower corner of a block
 * @param {{ x: number, y: number, z: number }} direction Unit vector along one axis (one component +-1) indicating a direction
 * @returns {{ x: number, y: number, z: number }} Lower corner of the block adjacent to `block` in the direction opposite `direction`
 */
const stepOneBlockBack = (block, direction) => ({
  x: block.x - 128 * direction.x,
  y: block.y - 128 * direction.y,
  z: block.z - 128 * direction.z
});



/**
 * Converts a block position object to a block string key (for use in sets or maps).
 *
 * @param {{ x: number, y: number, z: number }} block Lower corner of a 128x128x128 block
 * @returns {string} Key in the form "x,y,z" giving the lower corner of the block
 */
const stringKeyFromBlock = (block) => `${block.x},${block.y},${block.z}`;

/**
 * Converts a block string key to a block position object.
 *
 * @param {string} key Key in the form "x,y,z" giving the lower corner of a 128x128x128 block
 * @returns {{ x: number, y: number, z: number }} Lower corner of the block
 */
function blockFromStringKey (key) {
  const [x, y, z] = key.split(",").map(Number);
  return { x, y, z };
}

/**
 * Finds the obstructed blocks in a standard PeTI map, given the
 * planes, brushes and brushsides BSP lumps.
 *
 * Uses the lumps to find solid brushes that contain axis-aligned
 * faces that bound the brush in all 6 axis directions.
 * For each valid brush that is fully inside a single 128x128x128
 * block, that block is returned.
 *
 * @param {Array} planes Parsed planes lump from the BSP
 * @param {Array} brushes Parsed brushes lump from the BSP
 * @param {Array} brushsides Parsed brushsides lump from the BSP
 * @returns {Set<string>|null} Set of "x,y,z" keys indicating the lower corner of each obstructed block, or null if the lumps are invalid
 */
function findSolidBlocksInStandardPeTIMap (planes, brushes, brushsides) {

  // Ensure the lumps are valid
  if (!Array.isArray(planes) || !Array.isArray(brushes) || !Array.isArray(brushsides)) {
    return null;
  }

  const CONTENTS_SOLID = 0x1;

  const tol = 1e-2;
  // Checks if two x,y,z vectors are equal, within tolerance
  const vecEquals = (v1, v2) => {
    return Math.abs(v1.x - v2.x) <= tol && Math.abs(v1.y - v2.y) <= tol && Math.abs(v1.z - v2.z) <= tol;
  };

  const obstructedBlocks = new Set();

  // Loop over all brushes
  for (let i = 0; i < brushes.length; i++) {
    const brush = brushes[i];

    // Only consider solid brushes
    if ((brush.contents & CONTENTS_SOLID) === 0) continue;

    const { firstside, numsides } = brush;

    let minX, maxX;
    let minY, maxY;
    let minZ, maxZ;
    for (let s = 0; s < numsides; s++) {
      const side = brushsides[firstside + s];
      if (side == null) break;

      // Discard all remaining sides once a side flagged as 'thin' is reached.
      // This is to discard brushes at the location of any type of button, and an invisible brush inside the
      // block whose lower corner is 0 128 -128 (these brushes do not obstruct the player).
      // This doesn't discard all brushes that have a thin side (e.g. many brushes in blocks behind entities
      // have a thin side but are still included) - this only discards brushes that have a thin side that is
      // necessary to (or is earlier in the brushsides lump than some side that is necessary to) bound the
      // brush.
      if (side.thin != 0) {
        break;
      }

      const plane = planes[side.planenum];
      if (plane == null) break;

      const n = plane.normal;
      // The plane normal points outward from the brush
      // So, for example, n = { x: 1, y: 0, z: 0 } means this plane gives an upper bound for x (because
      // all brushes are convex)
      if (vecEquals(n, { x: 1, y: 0, z: 0 })) maxX = plane.dist;
      else if (vecEquals(n, { x: -1, y: 0, z: 0 })) minX = -plane.dist;
      else if (vecEquals(n, { x: 0, y: 1, z: 0 })) maxY = plane.dist;
      else if (vecEquals(n, { x: 0, y: -1, z: 0 })) minY = -plane.dist;
      else if (vecEquals(n, { x: 0, y: 0, z: 1 })) maxZ = plane.dist;
      else if (vecEquals(n, { x: 0, y: 0, z: -1 })) minZ = -plane.dist;
    }
    // Only consider brushes that contain axis-aligned faces that bound the brush in all 6 axis directions
    if (minX === undefined || maxX === undefined ||
        minY === undefined || maxY === undefined ||
        minZ === undefined || maxZ === undefined) {
      continue;
    }

    // Only consider brushes that are fully inside a single 128x128x128 block
    // Since we also want to include brushes that occupy the full 128x128x128, ensure the upper corner's
    // coordinates are rounded down if they're at the boundary of a block
    const lowerBlock = findLowerCornerOfBlock({ x: minX, y: minY, z: minZ });
    const upperBlock = findLowerCornerOfBlock({ x: maxX - 1e-1, y: maxY - 1e-1, z: maxZ - 1e-1 });
    if (!vecEquals(lowerBlock, upperBlock)) continue;

    // There are many blocks around the entrance elevator and exit elevator which are far from the puzzle.
    // These blocks do not contribute to the boundaries of the puzzle, and they should not be included as
    // they would greatly increase the boundaries of the search space.
    // These blocks can be identified using the fact that they have far lower x coordinates than the blocks
    // of the main puzzle.
    // The standard solid 128x128x128 PeTI blocks of the puzzle have a minimum x of -128, and entities in
    // the puzzle can obstruct up to 4 blocks into the wall (3 blocks further than the normal wall), so when
    // all obstructed blocks are included the puzzle's boundaries can have a minimum x of -128 - 3 * 128.
    if (lowerBlock.x < -5 * 128) continue;

    // Add this block to the set of obstructed blocks
    obstructedBlocks.add(stringKeyFromBlock(lowerBlock));
  }

  return obstructedBlocks;

}

/**
 * Finds all blocks reachable from the start position, avoiding obstructed blocks.
 *
 * Converts the given start position to the cell on the 128*128*128 grid that
 * contains it, then performs a breadth-first search on the grid.
 * Movement is only allowed through cells not in occupiedLocations.
 *
 * @param {{ x: number, y: number, z: number }|[number, number, number]} startLocation Position from which to start the search (object or [x,y,z] array)
 * @param {Set<string>} occupiedLocations Set of cells that are obstructed (each given as an "x,y,z" key indicating the lower corner of a 128*128*128 cell)
 * @param {{ minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number }} bounds The inclusive limits of the search space (each value given as a coordinate of the lower corner of a 128*128*128 cell)
 * @param {boolean} isStartRegion If true, also step in two axis directions at once, to a diagonally adjacent 128*128*128 cell
 * @returns {Set<string>|null} Set of reachable blocks (each given as an "x,y,z" key), or null if the given bounds are too wide in some dimension
 */
function findAllReachableBlocks (startLocation, occupiedLocations, bounds, isStartRegion) {

  // The PeTI map creator allows the interior of maps to be up to 25 blocks in each dimension.
  // This is up to 27 blocks in some dimension when you include standard solid blocks, up to 33 in some dimension
  // when you include obstructed blocks behind entities (these are up to 4 blocks behind each wall, which is 3 blocks
  // further than the normal wall), and up to 35 in some dimension if you include a block of space around the map.
  const EXPLORABLE_REGION_DIMENSION_LIMIT = 35 * 128;
  // If the region to be explored is somehow larger in some dimension than should be possible for a map created with
  // the PeTI map creator, don't pathfind
  if (
    (bounds.maxX - bounds.minX) > EXPLORABLE_REGION_DIMENSION_LIMIT
    || (bounds.maxY - bounds.minY) > EXPLORABLE_REGION_DIMENSION_LIMIT
    || (bounds.maxZ - bounds.minZ) > EXPLORABLE_REGION_DIMENSION_LIMIT
  ) return null;

  const withinBounds = (b) => bounds.minX <= b.x && b.x <= bounds.maxX && bounds.minY <= b.y && b.y <= bounds.maxY && bounds.minZ <= b.z && b.z <= bounds.maxZ;

  // Convert the start location to the lower corner of the 128*128*128 cell that contains it
  const startBlock = findLowerCornerOfBlock(startLocation);

  const startKey = stringKeyFromBlock(startBlock);

  // Adjacent non-obstructed blocks are in the same region, so the search can take a step in one axis direction
  const deltas = [[128, 0, 0], [-128, 0, 0], [0, 128, 0], [0, -128, 0], [0, 0, 128], [0, 0, -128]];
  // If the player starts in this region, then even if another block can only be reached by a step in 2 axis
  // directions at once, light, darkness, gel, or the appearance of a texture can seep through the shared edge to
  // alert the player that there is a non-obstructed block on the other side. With that knowledge, the player may be
  // able to portal bump straight there using the floor or the ceiling, or get there via e.g. mid-portal
  // teleportation, spinning PPD. So the search can step in two axis directions at once if this is the start region.
  if (isStartRegion) deltas.push(
    [128, 128, 0], [128, -128, 0], [-128, 128, 0], [-128, -128, 0],
    [128, 0, 128], [128, 0, -128], [-128, 0, 128], [-128, 0, -128],
    [0, 128, 128], [0, 128, -128], [0, -128, 128], [0, -128, -128]
  );

  if (occupiedLocations.has(startKey)) return new Set();
  const visited = new Set([startKey]);
  const queue = [startBlock];

  let headOfQueue = 0;

  // Main breadth-first search loop
  while (headOfQueue < queue.length) {
    const cur = queue[headOfQueue++];
    // Try to take a step in each allowed direction
    for (const [dx, dy, dz] of deltas) {
      const next = { x: cur.x + dx, y: cur.y + dy, z: cur.z + dz };
      const nextKey = stringKeyFromBlock(next);
      if (withinBounds(next) && !occupiedLocations.has(nextKey) && !visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push(next);
      }
    }
  }
  return visited;

}

/**
 * Determines whether the set of orientations contains two that are opposite each other.
 *
 * @param {Iterable<[number, number, number] | undefined>} orientations The orientations to check, each as a `[pitch, yaw, roll]` array in degrees as given in an entity's `angles` property
 * @returns {boolean} `true` if any two orientations are opposite each other, `false` otherwise
 */
function containsTwoOpposite (orientations) {

  const directionVectors = new Set();
  for (let angles of orientations) {
    // Extract pitch, yaw, roll (in radians) from angles (in degrees)
    if (angles == null) angles = [0, 0, 0];
    if (angles[0] == null || angles[1] == null || angles[2] == null) continue;
    const [pitch, yaw, roll] = angles.map(deg => deg * Math.PI / 180);

    // Convert pitch, yaw, roll to an x, y, z unit vector (for a button, this gives the
    // direction that it extrudes from its surface)
    const x = Math.round(Math.cos(roll) * Math.sin(pitch) * Math.cos(yaw) + Math.sin(roll) * Math.sin(yaw));
    const y = Math.round(Math.cos(roll) * Math.sin(pitch) * Math.sin(yaw) - Math.sin(roll) * Math.cos(yaw));
    const z = Math.round(Math.cos(roll) * Math.cos(pitch));

    // If we've already seen the opposite orientation, return true
    if (directionVectors.has(`${-x},${-y},${-z}`)) return true;
    // Store this orientation
    directionVectors.add(`${x},${y},${z}`);
  }
  return false;

}


/**
 * This is a no-op function, since while running the Epochtal system maps are not flagged for manual review.
 * Calls remain so the same code can be used when scanning the workshop for maps that should be flagged for
 * manual review so that, if they are manually determined to be unsolvable, they can be added to the blacklist.
 *
 * @param {string} reason The reason the map was flagged for manual review
 * @returns {void}
 */
function flagForManualReview (reason) {}

/**
 * Returns the solvability of the map given that the exit door starts closed and the conditions required to
 * open it cannot be satisfied.
 * If the map has a standard unskippable exit, this is sufficient to declare the map unsolvable.
 * If the map does not have a standard unskippable exit, the map may be solvable via skipping past the exit
 * door (with e.g. PPD, propless SPPD, mid-portal teleportation) or via a trigger that ends the map - so
 * flag the map for manual review.
 * 
 * @param {boolean} isStandardUnskippableExit Whether or not the map has a standard unskippable exit
 * @returns {boolean} `false` if the map is determined to be unsolvable, `true` otherwise
 */
function solvabilityGivenClosedExitDoorCannotBeOpened (isStandardUnskippableExit) {
  if (isStandardUnskippableExit) return false;
  else {
    flagForManualReview("Closed exit door cannot be opened, but the exit does not have the standard unskippable structure, so skipping past the exit door or exiting the map via a trigger may allow the map to be solved");
    return true;
  }
}

/**
 * Determines whether a Portal 2 workshop map MAY BE solvable or IS FOUND TO BE unsolvable under inbounds NoSLA rules
 * (or is found to have a different issue that requires it to be filtered out of the map pool).
 * This function is separate from the manual blacklist, which is also used to filter out maps.
 * 
 * For Hammer maps: returns `false` if there is no way to run a function that ends the map (via entity input, or via
 * a script or config file).
 *
 * For BEEmod maps: returns `false` if there is no way to satisfy the conditions required to open the exit door and no
 * method to complete the map without opening the exit door.
 * 
 * For standard PeTI maps: returns `false` if there is no path from the start to the exit or no way to
 * satisfy the conditions required to open the exit door.
 * 
 * There are other playability issues that can cause a map to be filtered out even though it may be solvable:
 * - Standard PeTI maps where the player has to travel to a completely disconnected region (the player would have to
 * guess where in the map another region is before they try to get there via e.g. mid-portal teleportation).
 * - PeTI maps with more than one exit door (the player may not realize they did SLA to change which exit door's world
 * portal would work).
 *
 * @param {object} data Workshop map data
 * @param {unknown} context The context object, defaults to epochtal
 * @returns {Promise<boolean>} `true` if the map MAY BE solvable, `false` if the map IS FOUND TO BE unsolvable or should be filtered out for a different reason
 */
async function isMapSolvable (data, context = epochtal) {

  const isHammerMap = data.creator_appid !== 620;

  // --------------------------------------------------------------------------------------------------------------- //
  // DOWNLOAD THE REQUIRED LUMPS FROM THE MAP'S BSP
  // --------------------------------------------------------------------------------------------------------------- //

  // For Hammer maps, we need the pakfile lump to check for script or config files that can end the map
  // For PeTI maps, we need the planes, brushes and brushsides lumps to allow pathfinding through the map
  // We also need entities for all maps
  const requiredLumpNames = (
    isHammerMap ? ["entities", "pakfile"]
    : ["entities", "planes", "brushes", "brushsides"]
  );
  const { entities, planes, brushes, brushsides, pakfile } = await curator(["lumps", data, requiredLumpNames], context);


  // --------------------------------------------------------------------------------------------------------------- //
  // FIND THE SET OF ENTITY-OUTPUT PAIRS THAT CAN BE FIRED AS A RESULT OF SOME OUTPUT FROM EACH ENTITY
  // --------------------------------------------------------------------------------------------------------------- //

  // Before tracing through inputs and outputs, initialize each entity's outputs in these ways:
  // - Add all outputs that can be added live during the map
  // - Find all entities whose name or class can change during the map
  // - Find all entities that can be enabled via outputs during the map
  const entitiesWhoseNameCanChange = new Set();
  const entitiesThatCanEnableDuringMap = new Set();
  for (const entity of entities) {
    // Iterate over all this entity's connections
    for (const output of Object.keys(entity.outputs ?? {})) {
      for (const [targetQuery, input, value] of iterableOfConnectionsFromEntityOutputs(entity, [output])) {

        if (input === "addoutput") {
          const v = value.trim();
          // If firing a certain input would change the name or class of the target entities, record that, so
          // that if it's a Hammer map we can later assume that there is some way to fire all outputs from
          // these target entities (in standard PeTI and BEEmod maps, the connections we are checking for don't
          // rely on changing names of entities, so we won't use this information)
          if (v.startsWith("targetname ") || v.startsWith("classname ")) {
            for (const targetEntity of applyTargetQuery(targetQuery, entity, entities))
              entitiesWhoseNameCanChange.add(targetEntity);
          }
          // If firing a certain input would add a new output to the target entities, then just add that output
          // to the target entities before we start tracing connections so that all tracing can use that output
          else if (v.includes(" ")) {
            const [newOutput, newConnection] = v.split(/\s+/);
            if (newConnection.includes(",") || newConnection.includes(":")) {
              const newConnectionArray = newConnection.split(/[,:]/);
              for (const targetEntity of applyTargetQuery(targetQuery, entity, entities)) {
                // Add the new output to this target entity
                if (targetEntity.outputs == null || typeof targetEntity.outputs !== "object") targetEntity.outputs = {};
                if (targetEntity.outputs[newOutput] === undefined) targetEntity.outputs[newOutput] = [];
                targetEntity.outputs[newOutput].push(newConnectionArray);
              }
            }
          }
        }
        // If this entity can be enabled during the map, record that, so that even if this entity
        // starts disabled it will not be treated as permanently disabled
        else if (input === "enable" || input === "toggle") {
          for (const targetEntity of applyTargetQuery(targetQuery, entity, entities))
            entitiesThatCanEnableDuringMap.add(targetEntity);
        }
        // If firing a certain input would run the command ent_fire, convert that to a standard output
        else if (input === "command") {
          // Extract the individual semicolon-separated commands
          const commands = value.split(";");
          for (const command of commands) {
            const cmd = command.trim();
            if (cmd.startsWith("ent_fire ")) {
              const entFireArguments = cmd.split(/\s+/);
              // Remove the term "ent_fire" when forming the standard connection array
              const newConnectionArray = entFireArguments.slice(1);
              entity.outputs[output].push(newConnectionArray);
            }
          }
        }

      }
    }
  }

  // If it's a Hammer map, read and cache any packed script/config files (lowercased)
  const packedScriptTexts = [];
  let scriptFileCanEnableEntities = false;
  if (isHammerMap) {
    if (pakfile != null && pakfile.files.length > 0) {
      // Cache the contents of each script and config file
      try {
        for (const file of pakfile.files) {
          if (file.path.endsWith(".nut") || file.path.endsWith(".cfg")) {
            const buf = await file.buffer();
            packedScriptTexts.push(buf.toString("utf8").toLowerCase());
          }
        }
      } catch (_) {
        // If Pakfile read fails in a Hammer map, don't declare that this map is unsolvable - flag the map
        // for manual review
        flagForManualReview("Hammer map's packed files failed to be read");
        return true;
      }
      // Check whether a packed script or config file can enable entities during the map
      for (const stringBuf of packedScriptTexts) {
        if (stringBuf.includes("enable") || stringBuf.includes("toggle")) {
          scriptFileCanEnableEntities = true;
          break;
        }
      }
    }
  }

  // Determine which entities are permanently disabled throughout the entire map - connections will not be
  // traced through such entities
  let entitiesThatArePermanentlyDisabled;
  if (scriptFileCanEnableEntities)
    entitiesThatArePermanentlyDisabled = new Set();
  else {
    entitiesThatArePermanentlyDisabled = new Set(
      entities.filter(e => e.startdisabled == 1 && !entitiesThatCanEnableDuringMap.has(e))
    );
  }


  const entitiesFromTargetQueryCache = new Map();

  // Find the entity inputs that can be fired by an input-output chain from each entity
  const targetedEntityInputsByEntity = new Map();
  for (const entity of entities) {
    let targetedEntityInputs;
    if (entitiesThatArePermanentlyDisabled.has(entity)) targetedEntityInputs = [];
    else if (entity.classname === "logic_auto") {
      const startOfMapOutputs = ["onmapspawn", "onnewgame", "onmaptransition"];
      // Since a logic auto can only fire these particular outputs at the start of the map,
      // assume logic relays' parameters are at their initial values when tracing these
      // connections - unless this is a Hammer map, where logic autos may both alter these values
      // and use these values, so logic relays' parameters may be used at a non-starting value
      const useValuesAtMapSpawn = !isHammerMap;
      const mapSpawnTargets = traceConnections(entity, startOfMapOutputs, entities, entitiesThatArePermanentlyDisabled, entitiesFromTargetQueryCache, useValuesAtMapSpawn);

      // Trace the other outputs of this logic auto without any assumption about the parameters 
      // of logic relays
      const otherOutputs = Object.keys(entity.outputs ?? {}).filter((output) => !startOfMapOutputs.includes(output));
      const nonMapSpawnTargets = traceConnections(entity, otherOutputs, entities, entitiesThatArePermanentlyDisabled, entitiesFromTargetQueryCache);

      targetedEntityInputs = mapSpawnTargets.concat(nonMapSpawnTargets);
    }
    else {
      // Get all outputs of this entity
      const outputs = Object.keys(entity.outputs ?? {});
      // Trace all input-output chains from this entity, collecting all entity inputs that can be
      // fired as a result of this entity first firing some output
      targetedEntityInputs = traceConnections(entity, outputs, entities, entitiesThatArePermanentlyDisabled, entitiesFromTargetQueryCache);
    }
    targetedEntityInputsByEntity.set(entity, targetedEntityInputs);
  }



  // Entities that cannot fire outputs without being targeted
  const passthroughEntityClasses = new Set(["filter_activator_class", "filter_activator_context", "filter_activator_model", "filter_activator_name", "filter_activator_team", "filter_damage_type", "filter_enemy", "filter_multi", "func_instance_io_proxy", "logic_branch", "logic_case", "logic_compare", "logic_multicompare", "logic_relay", "math_counter", "math_remap", "point_broadcastclientcommand", "point_clientcommand", "point_servercommand", "point_template"]);

  // --------------------------------------------------------------------------------------------------------------- //
  // HAMMER MAP CHECK: TO BE SOLVABLE, THE MAP MUST HAVE SOME METHOD OF RUNNING A FUNCTION THAT CAN END THE MAP
  // This can be done via an entity that runs a script-related command, or via a packed script or config file
  // --------------------------------------------------------------------------------------------------------------- //

  // Check for entity connections with an input and value that can run a function that can end the map
  if (isHammerMap) {

    const completionCommands = ["command", "runscriptcode", "callscriptfunction"];
    // Some Hammer maps display "End of Playtest" or "Test complete. Restarting..." instead of finishing properly
    // The system automatically fixes these maps' endings, so these maps are not filtered out
    const completionFunctions = ["requestmaprating", "callvote", "transitionfrommap"];
    const completionDisplayMessages = ["@preview_complete_message", "preview_complete_message", "@end_of_playtest_text", "end_of_playtest_text"];

    const passthroughEntitiesThatCanEndMap = new Set();

    for (const entity of entities) {
      const targetedEntityInputs = targetedEntityInputsByEntity.get(entity);
      for (const entityInput of targetedEntityInputs) {
        const tgEntityName = (entityInput.entity.targetname ?? "").toLowerCase();
        const input = entityInput.input;
        const value = entityInput.value;
        // See if this connection can end the map
        if (
          (completionCommands.includes(input) && completionFunctions.some(fn => value.includes(fn)))
          || (completionDisplayMessages.includes(tgEntityName) && input === "display")
        ) {
          // If the entity that eventually leads to this entity-input-value cannot itself fire outputs without being
          // targeted, then we have not found a way to initiate an input-output chain that can end the map - add
          // this entity to a list so that if no entity can start such an input-output chain, we can later check
          // whether there's a different way to fire this entity
          if (passthroughEntityClasses.has(entity.classname)) passthroughEntitiesThatCanEndMap.add(entity);
          // If the entity that eventually leads to this entity-input-value can fire outputs without being targeted
          // (e.g. a trigger can fire an output when an entity touches it), the map may be solvable with an
          // input-output chain starting from this entity
          else return true;
        }
      }
    }

    // If this entity that can end the map can have its name or class change during
    // the map, assume there is a way to fire it
    for (const entity of passthroughEntitiesThatCanEndMap) {
      if (entitiesWhoseNameCanChange.has(entity)) {
        flagForManualReview("The only entity/ies that can fire an output to end the Hammer map aren't firable by any other entity, with their current name - but they can have their targetname or classname changed during the map, so they may be firable by another entity (the map also may be beatable via a packed script or config file firing an entity or running a function - this was not yet checked)");
        return true;
      }
    }

    // Check if the pakfile lump has any script file (*.nut) or config file (*.cfg)
    // containing a function that can end the map
    for (const scriptText of packedScriptTexts) {
      for (const fn of completionFunctions) {
        if (scriptText.includes(fn)) {
          flagForManualReview("Script or config file may be able to run a function that can end the map (or fire an entity that can end the map - this was not yet checked)");
          return true;
        }
      }
    }
    // Check if the pakfile lump has any script file (*.nut) or config file (*.cfg)
    // containing a reference to an entity that has an input that can end the map
    for (const scriptText of packedScriptTexts) {
      for (const e of passthroughEntitiesThatCanEndMap) {
        const tgName = (e.targetname ?? "").toLowerCase();
        const clsName = (e.classname ?? "").toLowerCase();
        if ((tgName && scriptText.includes(tgName)) || (clsName && scriptText.includes(clsName))) {
          flagForManualReview("Script or config file may be able to fire an entity that can end the map");
          return true;
        }
      }
    }

    // If the Hammer map has no mechanism that can end the map, it is unsolvable
    return false;

  }


  const isBEEmodMap = await checkWhetherBEEmod(entities);

  // Determine whether this map is a cooperative map by checking for the workshop tag "Cooperative"
  const tags = (data.tags ?? []).map(t => String(t.tag ?? "").toLowerCase());
  const isCoop = tags.includes("cooperative");

  // In most cooperative BEEmod maps, there is a trigger past the first exit door that opens that
  // exit door, allowing both players to progress through the exit airlock door. This makes many of
  // these maps solvable by one player skipping past the exit door via e.g. PPD, propless SPPD,
  // mid-portal teleportation. For this reason, all cooperative BEEmod maps are assumed to be
  // solvable (and some code has not been written to analyse these maps' exits).
  if (isCoop && isBEEmodMap) return true;


  // --------------------------------------------------------------------------------------------------------------- //
  // FIND ALL ENTITIES THAT ARE RELEVANT FOR OUR SOLVABILITY CHECKS
  // --------------------------------------------------------------------------------------------------------------- //

  const criticalEntities = [];

  // We make sure the start comes before anything else in our criticalEntities array, to ensure we explore
  // from the start before exploring any other region. This is because when exploring from the start, blocks
  // that share an edge are considered to be in the same region, not just blocks that share a face - so if we
  // explored a different region first, it might occupy a space that would have been reachable from the start.
  for (const entity of entities) {
    if (
      (entity.classname === "prop_testchamber_door" && entity.targetname === "@entrance_door")
      || (entity.classname === "logic_coop_manager" && removeAllNumbers(entity.targetname) === "doorentry-coopmanage_return_hub")
    ) {
      criticalEntities.push(entity);
    }
  }

  for (const entity of entities) {
    if (
      (entity.classname === "prop_testchamber_door" && entity.targetname === "@exit_door")
      || [
        "prop_floor_button", "prop_floor_cube_button", "prop_floor_ball_button", "prop_button",
        "prop_laser_catcher", "prop_laser_relay", "env_portal_laser", "prop_weighted_cube", "prop_monster_box"
      ].includes(entity.classname)
    ) {

      // PeTI droppers, regardless of the type of associated box, generally come with an entity of
      // class "prop_monster_box" whose targetname ends with "cube_dropper_monster_box". Boxes,
      // their type (cube or sphere), and whether each specific one is associated with a dropper,
      // are all identified independently of this entity, so we ignore this entity.
      if ((entity.targetname ?? "").endsWith("cube_dropper_monster_box")) continue;

      criticalEntities.push(entity);
    }
  }

  // --------------------------------------------------------------------------------------------------------------- //
  // FIND THE LOCATION OF EACH OF THOSE RELEVANT ENTITIES
  // --------------------------------------------------------------------------------------------------------------- //

  const blockByEntity = new Map();

  const LASER_EMITTER_INDENTED_DISTANCE = 16;
  const LASER_CATCHER_INDENTED_DISTANCE = 16;
  const CUBE_DROPPER_CUBE_INDENTED_DISTANCE = 28;
  const DOOR_INDENTED_DISTANCE = 13;

  for (const entity of criticalEntities) {
    const o = entity.origin;
    if (o == null || o[0] == null || o[1] == null || o[2] == null) continue;
    const origin = { x: o[0], y: o[1], z: o[2] };
    const entityBlock = findLowerCornerOfBlock(origin);
    // Laser emitters, laser catchers, cubes inside cube droppers, and testchamber doors
    // are indented a bit into their surface.
    // So if this is one of those entities, shift one block out of the wall to find the
    // block inside the chamber, so that we can assign the correct region to this entity.
    let block = entityBlock;
    if (entity.classname === "prop_laser_catcher") { // Laser catcher
      const indentDirection = findIndentDirection(origin, LASER_CATCHER_INDENTED_DISTANCE);
      if (indentDirection != null)
        block = stepOneBlockBack(entityBlock, indentDirection);
    }
    else if (entity.classname === "env_portal_laser") { // Laser emitter
      const indentDirection = findIndentDirection(origin, LASER_EMITTER_INDENTED_DISTANCE);
      if (indentDirection != null)
        block = stepOneBlockBack(entityBlock, indentDirection);
    }
    // Note that in standard PeTI and BEEmod maps, even frankenturrets show up in the
    // entities lump as a prop_weighted_cube if they have a cube dropper
    else if (entity.classname === "prop_weighted_cube" && (entity.targetname ?? "").includes("cube_dropper")) { // Cube inside cube dropper
      const indentDirection = findIndentDirection(origin, CUBE_DROPPER_CUBE_INDENTED_DISTANCE);
      if (indentDirection != null)
        block = stepOneBlockBack(entityBlock, indentDirection);
    }
    else if (
      entity.classname === "prop_testchamber_door" // Testchamber door
      && (entity.targetname === "@entrance_door" || entity.targetname === "@exit_door")
    ) {
      const indentDirection = findIndentDirection(origin, DOOR_INDENTED_DISTANCE);
      if (indentDirection != null)
        block = stepOneBlockBack(entityBlock, indentDirection);
    }

    blockByEntity.set(entity, block);
  }


  // --------------------------------------------------------------------------------------------------------------- //
  // DIVIDE THE MAP INTO REGIONS SEPARATED BY SOLID 128*128*128 BLOCKS
  // Each region consists of non-solid 128*128*128 blocks
  // --------------------------------------------------------------------------------------------------------------- //

  const criticalEntitiesByRegion = [];
  const regionByCriticalEntity = new Map();
  const entranceRegionNumbers = new Set();
  const exitRegionNumbers = new Set();
  const regionByBlock = new Map();

  // If the map is made with BEEmod, we don't run pathfinding.
  // If, in the future, detection of obstructed blocks in BEEmod maps is implemented, then for it to be used
  // to declare maps unsolvable, detection of various other situations that could make a BEEmod map solvable
  // would also need to be implemented (for example, auto-portals, or portal guns on pedestals that can fire
  // portals, or additional world portals, or the BEEmod chamber-type where you can always skip the entire
  // puzzle, or getting funnel fly without closing the start door and going back through the start door to
  // navigate around the entire puzzle with funnel fly).
  if (!isBEEmodMap) {
    // Find the solid blocks in this standard PeTI map
    const occupiedLocations = findSolidBlocksInStandardPeTIMap(planes, brushes, brushsides);
    if (occupiedLocations != null && occupiedLocations.size > 0) {

      // Find the bounds of the map to limit our pathfinding
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const blockKey of occupiedLocations) {
        const { x, y, z } = blockFromStringKey(blockKey);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      // Extend the bounds by 1 block in each direction to allow for exploration of the region outside the map
      const bounds = { minX: minX - 128, maxX: maxX + 128, minY: minY - 128, maxY: maxY + 128, minZ: minZ - 128, maxZ: maxZ + 128 };
      // Explore the region outside the map
      const exampleBlockOutsideMap = {x: bounds.minX, y: bounds.minY, z: bounds.minZ};
      const blocksOutsideMap = findAllReachableBlocks(exampleBlockOutsideMap, occupiedLocations, bounds, false);
      // If the map is somehow larger in some dimension than the PeTI size limit, then pathfinding would
      // not have occurred, so don't divide the map into regions
      if (blocksOutsideMap != null) {

        const blocksOutsideMapAndOccupiedLocations = new Set([...blocksOutsideMap, ...occupiedLocations]);

        // If any relevant entity is in an obstructed block or is outside all blocks in the map,
        // don't divide the map into regions
        let criticalEntityNotAtValidLocation = false;
        for (const entity of criticalEntities) {
          const block = blockByEntity.get(entity);
          if (block === undefined || blocksOutsideMapAndOccupiedLocations.has(stringKeyFromBlock(block))) {
            criticalEntityNotAtValidLocation = true;
            break;
          }
        }
        if (!criticalEntityNotAtValidLocation) {

          // For every relevant entity, run pathfinding from its location to
          // explore its region (if it hasn't yet been explored)
          for (const entity of criticalEntities) {

            const block = blockByEntity.get(entity);
            const blockKey = stringKeyFromBlock(block);

            // This is a standard PeTI (non-BEEmod) map, so the entrance will
            // always be in the standard singleplayer or cooperative form
            const isStartOfMap =
              (entity.classname === "prop_testchamber_door" && entity.targetname === "@entrance_door")
              || (entity.classname === "logic_coop_manager" && removeAllNumbers(entity.targetname) === "doorentry-coopmanage_return_hub");

            let regionNumber = regionByBlock.get(blockKey);
            // If this region has already been explored, the region number of this block is set
            // Otherwise, explore this region to find all reachable blocks, and assign a new region number to those blocks
            if (regionNumber === undefined) {
              // Set up to store a new region
              criticalEntitiesByRegion.push([]);
              regionNumber = criticalEntitiesByRegion.length - 1;
              // If this is the start region, we can move in some diagonal directions, so we need to restrict locations that
              // are outside the map
              // If this is not the start region, we don't need to restrict locations that are outside the map, because if we
              // could reach outside the map from this location then we would have already reached this location from outside
              // the map
              const blocksRestrictedInSearch = (isStartOfMap ? blocksOutsideMapAndOccupiedLocations : occupiedLocations);
              // Explore the new region
              const reachableBlocks = findAllReachableBlocks(block, blocksRestrictedInSearch, bounds, isStartOfMap);

              for (const b of reachableBlocks) regionByBlock.set(b, regionNumber);
            }
            criticalEntitiesByRegion[regionNumber].push(entity);
            regionByCriticalEntity.set(entity, regionNumber);

            if (isStartOfMap)
              entranceRegionNumbers.add(regionNumber);
            // This is a standard PeTI (non-BEEmod) map, so the exit will always be in this standard form
            else if (entity.classname === "prop_testchamber_door" && entity.targetname === "@exit_door")
              exitRegionNumbers.add(regionNumber);
          }
        }
      }
    }
    // If this is a standard PeTI (non-BEEmod) map, and we did not divide the
    // map into regions, flag the map for manual review
    if (criticalEntitiesByRegion.length === 0) flagForManualReview("Failed to divide standard PeTI (non-BEEmod) map into regions");
  }

  // If we did not divide the map into regions, consider every relevant entity to be in region 0
  if (criticalEntitiesByRegion.length === 0) {
    criticalEntitiesByRegion.push([]);
    for (const entity of criticalEntities) {
      criticalEntitiesByRegion[0].push(entity);
      regionByCriticalEntity.set(entity, 0);
    }
    // This may be a BEEmod map, so the map may or may not have an entrance or exit door - assume
    // the player can start and exit in the single region we're defining
    entranceRegionNumbers.add(0);
    exitRegionNumbers.add(0);
  }

  const numRegions = criticalEntitiesByRegion.length;


  // --------------------------------------------------------------------------------------------------------------- //
  // FIND THE PROPERTIES OF EACH LASER IN THE MAP
  // --------------------------------------------------------------------------------------------------------------- //

  const entireMapLasersThatStartOn = new Set();
  const entireMapLasersWithAnyConnection = new Set();
  const entireMapLasersWithCatcherOrRelayConnection = new Set();

  for (const entity of entities) {

    const targetedEntityInputs = targetedEntityInputsByEntity.get(entity);
    for (const laserInput of targetedEntityInputs.filter(o =>
      o.entity.classname === "env_portal_laser" && (o.input === "toggle" || o.input === "turnon")
    )) {
      // Many lasers have entities such as a func_instance_io_proxy, a math_counter and a logic_branch
      // that connect to them but cannot fire outputs without being targeted by another entity. This
      // doesn't mean that anything can actually start an input-output chain to trigger the laser
      // during the map.
      // Also, a logic_auto controls whether the laser is triggered on at the start of the map, but
      // that doesn't mean anything can actually trigger the laser during the map.
      if (!passthroughEntityClasses.has(entity.classname) && entity.classname !== "logic_auto") {
        // Record which entity classes activate each laser
        entireMapLasersWithAnyConnection.add(laserInput.entity);
        if (entity.classname === "prop_laser_catcher" || entity.classname === "prop_laser_relay")
          entireMapLasersWithCatcherOrRelayConnection.add(laserInput.entity);
      }
      else if (entity.classname === "logic_branch") {
        // This is the first condition that could make a laser start enabled:
        // A logic_branch with initialvalue 1 links to the laser.
        // This is the condition used by standard PeTI maps.
        if (entity.initialvalue == 1) entireMapLasersThatStartOn.add(laserInput.entity);
      }
    }

    // This is the second condition that could make a laser start enabled:
    // The laser's startstate is 0 (or is a reference to an instance variable that may be 0).
    // This condition is used in some BEEmod maps.
    if (
      entity.classname === "env_portal_laser"
      && (entity.startstate == 0 || String(entity.startstate ?? "").startsWith("$"))
    ) entireMapLasersThatStartOn.add(entity);
  }


  // --------------------------------------------------------------------------------------------------------------- //
  // FIND WHICH CUBES ARE STUCK INSIDE STANDARD PeTI CUBE DROPPERS THAT CAN NEVER OPEN
  // These are cubes whose droppers are not on auto-drop and cannot be triggered during the map
  // --------------------------------------------------------------------------------------------------------------- //

  // Find which logic relays can be triggered during the map
  const logicRelaysThatCanBeTriggered = new Set();
  for (const entity of entities) {
    if (passthroughEntityClasses.has(entity.classname)) continue;
    const targetedEntityInputs = targetedEntityInputsByEntity.get(entity);
    for (const entityInput of targetedEntityInputs) {
      if (entityInput.entity.classname === "logic_relay" && entityInput.input === "trigger")
        logicRelaysThatCanBeTriggered.add(entityInput.entity);
    }
  }

  // Each standard PeTI cube dropper has a logic relay that is responsible for dropping the cube
  // Find which cubes have a dropper where this logic relay can never be triggered

  const cubesThatCannotBeExtracted = new Set();
  // Loop over each cube that has a dropper
  // Note that in standard PeTI and BEEmod maps, even frankenturrets show up in the entities lump as
  // a prop_weighted_cube if they have a cube dropper
  for (const standardPeTICubeWithDropper of criticalEntities.filter(e => 
    e.classname === "prop_weighted_cube" && removeAllNumbers(e.targetname) === "cubedropper-cube_dropper_box"
  )) {
    // Find the logic relay that is responsible for dropping this cube
    const index = standardPeTICubeWithDropper.targetname.indexOf("-");
    const prefix = standardPeTICubeWithDropper.targetname.slice(0, index);
    const associatedLogicRelay = entities.find(e => e.targetname === prefix + "-cube_dropper_relay" && e.classname === "logic_relay");
    // If there is no way to trigger this logic relay, this cube cannot be extracted from its dropper
    // This accounts for both auto-drop and triggering the dropper later in the map
    if (associatedLogicRelay != null && !logicRelaysThatCanBeTriggered.has(associatedLogicRelay))
      cubesThatCannotBeExtracted.add(standardPeTICubeWithDropper);
  }


  // --------------------------------------------------------------------------------------------------------------- //
  // FIND WHICH BUTTONS CAN BE FIRED BY ENTITY INPUT-OUTPUT, RATHER THAN NEEDING A PROP OR PLAYER TO PRESS THEM DOWN
  // This happens in some BEEmod maps that use buttons in their
  // implementation of custom instances that can target the exit door
  // --------------------------------------------------------------------------------------------------------------- //

  const buttonsThatCanBeFired = new Set();
  for (const entity of entities) {
    if (passthroughEntityClasses.has(entity.classname)) continue;
    const targetedEntityInputs = targetedEntityInputsByEntity.get(entity);
    for (const entityInput of targetedEntityInputs) {
      if (
        (["prop_floor_button", "prop_floor_cube_button", "prop_floor_ball_button"].includes(entityInput.entity.classname)
        && entityInput.input === "pressin")
        || (entityInput.entity.classname === "prop_button" && entityInput.input === "press")
      ) buttonsThatCanBeFired.add(entityInput.entity);
    }
  }


  // --------------------------------------------------------------------------------------------------------------- //
  // CHECK WHETHER THE CONDITIONS THAT APPLY ACROSS ALL REGIONS ARE SATISFIED
  // --------------------------------------------------------------------------------------------------------------- //

  // If a singleplayer map has more than one exit door, declare the map unsolvable, even though
  // it may be solvable - this is to filter it out of the map pool due to the concern that the
  // player may not realize they did SLA to change which exit door's world portal worked
  const numExitDoors = entities.filter(e => e.classname === "prop_testchamber_door" && e.targetname === "@exit_door").length;
  if (!isCoop && numExitDoors > 1) {
    return false;
  }

  // If the start region does not contain an exit, declare the map unsolvable
  // If this is a BEEmod map, the start and exit (as well as all entities) are considered to be in region 0
  if (![...entranceRegionNumbers].some(i => exitRegionNumbers.has(i))) {
    return false;
  }


  // In standard PeTI maps and some BEEmod maps, the exit door has to BECOME fully closed in order for
  // the second exit door (the airlock door) to open, which causes the exit world portal to open
  // (there is also a second requirement to open the second exit door, which is a trigger).
  // Because of this, skipping past the exit door without opening it does not allow the player to
  // complete the map.

  // However, in some BEEmod map types, the exit does not have this standard airlock structure.
  // In these maps, skipping past the exit door while it's closed (with e.g. mid-portal teleportation,
  // PPD, propless SPPD) allows the player to continue - so if we can't satisfy the conditions to open
  // the exit door, but the exit does not have the standard airlock structure, flag the map for manual
  // review.

  // If it's a BEEmod map of a type where you can sometimes navigate around the entire puzzle, the map
  // should not be declared unsolvable.
  // These maps do not have standard airlock exits, so they are already considered solvable due to this
  // check - and we are not running pathfinding on BEEmod maps, so these maps won't be declared
  // unsolvable if the exit door is unreachable.

  let hasStandardAirlockExit = false;
  const exitDoorEntity = entities.find(e => e.classname === "prop_testchamber_door" && e.targetname === "@exit_door");
  if (exitDoorEntity !== undefined) {
    // See if this is the standard airlock structure (where @exit_door has to be open or opening so
    // that it can then fully close, allowing @exit_airlock_door to open)
    for (const entityInput of targetedEntityInputsByEntity.get(exitDoorEntity)) {
      if (entityInput.entity.targetname === "@exit_airlock_door" && entityInput.input === "open")
        hasStandardAirlockExit = true;
    }
  }

  // Standard PeTI maps and most BEEmod maps have a logic_branch_listener that fires 'trigger' on the
  // standard PeTI exit relay to end the map.
  // However, some BEEmod maps have a trigger that fires 'trigger' on that exit relay - the trigger
  // may be positioned anywhere and activated by anything, so we assume that these maps do not have
  // unskippable exits.
  let hasTriggerThatEndsMap = false;
  for (const entity of entities.filter(e => (e.classname ?? "").startsWith("trigger_"))) {
    if (targetedEntityInputsByEntity.get(entity).some(entityInput =>
      entityInput.entity.targetname === "@relay_pti_level_end" && entityInput.input === "trigger"
    )) {
      hasTriggerThatEndsMap = true;
      break;
    }
  }

  // (Most cooperative BEEmod maps actually shouldn't count as having an unskippable exit, because they
  // have a trigger past the first exit door that opens that first exit door, meaning that skipping
  // past the first exit door allows the players to progress - but cooperative BEEmod maps are already
  // assumed to be solvable anyway.)
  const hasStandardUnskippableExit = hasStandardAirlockExit && !hasTriggerThatEndsMap;


  // Some standard PeTI maps (not BEEmod) that were last updated in June 2012 have a broken
  // relay-enable connection that prevents their exit airlock door (the second exit door) from being
  // able to open. This means their exit world portal can never open, which prevents the player from
  // being able to complete these maps.
  // The system automatically fixes these maps' exit airlocks, so these maps are not filtered out.


  // Some BEEmod maps check for pellet launcher models and, if BEEmod is not installed, teleport the
  // player away from the puzzle and display the message "You can not play this level without the
  // BEEMOD, or the BEEMOD Resource Package installed. ...".
  // The system automatically fixes these maps, so these maps are not filtered out.


  // If there is no standard exit door, as in some BEEmod themes, the map is considered solvable
  if (numExitDoors === 0) return true;


  // If the exit door is open on singleplayer or unlocked on cooperative by default, the map is
  // considered solvable (the method of checking used here doesn't work for cooperative BEEmod maps,
  // but those maps are already assumed to be solvable anyway)
  if (
    entities.some(e =>
      removeAllNumbers(e.targetname) === "doorexit-branch_toggle"
      && ((isCoop && e.initialvalue == 0) || (!isCoop && e.initialvalue == 1))
    )
  ) {
    return true;
  }


  // Find which entities are required to unlock the exit door

  const entitiesThatUnlockExitDoor = new Set();

  for (const entity of entities) {
    let unlocksExitDoor = false;
    const targetedEntityInputs = targetedEntityInputsByEntity.get(entity);
    if (isCoop) {
      // For cooperative standard PeTI maps
      if (targetedEntityInputs.some(t =>
        t.entity.targetname === "@door_unlocked" && t.input === "setvalue" && t.value == 1
      )) unlocksExitDoor = true;
      // For cooperative BEEmod maps
      if (targetedEntityInputs.some(t =>
        removeAllNumbers(t.entity.targetname) === "@doorexit_counter" && t.input === "add"
      )) unlocksExitDoor = true;
    }
    else {
      // For singleplayer standard PeTI and BEEmod maps
      if (targetedEntityInputs.some(t => t.entity.targetname === "@exit_door" && t.input === "open"))
        unlocksExitDoor = true;
    }
    if (unlocksExitDoor) entitiesThatUnlockExitDoor.add(entity);
  }


  // If nothing connects to the exit door (which is closed by default if this part of the code
  // is reached), the exit cannot be opened
  let exitConnected = false;
  for (const entity of entities) {
    // In order for something to be able to open the exit door, there must be an entity that
    // can start the output chain that opens it (e.g. just having a func_instance_io_proxy
    // that can open the door is not sufficient)
    if (passthroughEntityClasses.has(entity.classname)) continue;
    // See whether this entity can open the exit door
    if (entitiesThatUnlockExitDoor.has(entity)) {
      exitConnected = true;
      break;
    }
  }
  if (!exitConnected) {
    return solvabilityGivenClosedExitDoorCannotBeOpened(hasStandardUnskippableExit);
  }


  // If it's cooperative mode and something that is connected to the exit door is triggerable
  // via player position, it can be stuck by Orange several times in order to unlock the door,
  // regardless of what else is connected to the door
  if (isCoop) {
    for (const entity of entities) {
      if (passthroughEntityClasses.has(entity.classname)) continue;
      // Check that this entity is connected to the exit door
      if (entitiesThatUnlockExitDoor.has(entity)) {
        // If it's a standard PeTI entity that can connect to the exit door, it can only be
        // stuck via player position if it's a floor button in the region reachable by players
        if (criticalEntities.includes(entity)) {
          if (entity.classname === "prop_floor_button" && entranceRegionNumbers.has(regionByCriticalEntity.get(entity)))
            return true;
        }
        // If it's not a standard PeTI entity that can connect to the exit door, assume it can
        // be stuck via player position
        else return true;
      }
    }
  }



  // Data for the whole map, collected across all regions
  const regionsWithExitLaserCatcherOrRelay = [];
  const regionsThatCouldBeFirstToActivateLaser = [];
  const regionsWithLasersActivatedByReceiverInGivenRegion = Array.from({ length: numRegions }, () => new Set());
  const containsReflectorCubeByRegion = new Array(numRegions).fill(false);


  // --------------------------------------------------------------------------------------------------------------- //
  // FOR EACH REGION, CHECK WHETHER THAT REGION CAN HAVE ALL ITS REQUIRED CONDITIONS SATISFIED
  // (e.g. if this region contains a sphere button that connects to
  // the exit door, then this region is required to contain a sphere)
  // --------------------------------------------------------------------------------------------------------------- //

  for (let regionNumber = 0; regionNumber < numRegions; regionNumber++) {

    let hasExitPedestalButton = false;
    let hasCubeDropperThatCanDrop = false, hasSphereDropperThatCanDrop = false;
    let cubeCount = 0, sphereCount = 0;
    // Each of these maps a block to the set of orientations that have a button within
    // that block exitAllButtonsByBlock includes cube buttons, sphere buttons, and floor
    // buttons (not necessarily on the floor) - it does not include pedestal buttons
    const exitCubeButtonsByBlock = new Map(), exitSphereButtonsByBlock = new Map(), exitAllButtonsByBlock = new Map();
    function addToMapSet (map, key, value) {
      const set = map.get(key) ?? new Set();
      set.add(value);
      map.set(key, set);
    }

    let hasExitLaserCatcherOrRelay = false;
    const lasers = new Set();

    // --------------------------------------------------------------------------------------------------------------- //
    // GO THROUGH EVERY ENTITY IN THIS REGION, COLLECTING INFORMATION
    // --------------------------------------------------------------------------------------------------------------- //

    if (criticalEntitiesByRegion[regionNumber] == null) continue;
    for (const entity of criticalEntitiesByRegion[regionNumber]) {

      // If this is a button that can be fired via entity input-output, a prop or player does not
      // need to press it down
      if (buttonsThatCanBeFired.has(entity)) continue;

      // Record any sphere buttons, cube buttons, floor buttons, pedestal buttons, laser catchers and
      // laser relays that target the exit door, so we can later check that they can be satisfied

      if (entitiesThatUnlockExitDoor.has(entity)) {

        const entityBlock = blockByEntity.get(entity);
        if (entityBlock === undefined) continue;
        const blockKey = stringKeyFromBlock(entityBlock);

        if (entity.classname === "prop_floor_ball_button") { // Sphere button
          addToMapSet(exitSphereButtonsByBlock, blockKey, entity.angles);
          addToMapSet(exitAllButtonsByBlock, blockKey, entity.angles);
        } else if (entity.classname === "prop_floor_cube_button") { // Cube button
          addToMapSet(exitCubeButtonsByBlock, blockKey, entity.angles);
          addToMapSet(exitAllButtonsByBlock, blockKey, entity.angles);
        } else if (entity.classname === "prop_floor_button") { // Floor button
          addToMapSet(exitAllButtonsByBlock, blockKey, entity.angles);
        }

        else if (entity.classname === "prop_button") { // Pedestal button
          hasExitPedestalButton = true;
        }

        else if (entity.classname === "prop_laser_catcher" || entity.classname === "prop_laser_relay") { // Laser catcher or relay
          hasExitLaserCatcherOrRelay = true;
        }
      }


      // Record any cubes and their properties

      if (entity.classname === "prop_weighted_cube" || entity.classname === "prop_monster_box") {

        // In standard PeTI maps, if a cube has a dropper its targetname contains "cube_dropper".
        // In some BEEmod maps, if a cube has a dropper its targetname starts with "cd" (sometimes containing
        // "cube_dropper", sometimes not).
        const tgName = (entity.targetname ?? "");
        const boxIsInDropper = tgName.includes("cube_dropper") || tgName.startsWith("cd");

        // If this cube is inside a standard PeTI dropper that can never drop, ignore this cube.
        // A cube stuck in its dropper can still block a laser, reflect a laser within its own region, or be
        // used for a PPD boost, but these do not affect any solvability checks that are performed.
        if (!cubesThatCannotBeExtracted.has(entity)) {

          // If this is a prop_weighted_cube with cubetype 3, it is a sphere.
          // If this is a prop_weighted_cube whose model contains "bumbleball", it is a BEEmod bumbleball,
          // which can also activate a sphere button, so count this as a sphere.
          if (
            entity.classname === "prop_weighted_cube"
            && (entity.cubetype == 3 || (entity.model ?? "").includes("bumbleball"))
          ) {
            sphereCount++;
            if (boxIsInDropper) hasSphereDropperThatCanDrop = true;
          }
          // Otherwise, this is a cube-shaped cube.
          // A frankenturret will show up in the entities lump as a prop_monster_box if it has no dropper, or
          // as a prop_weighted_cube with cubetype 6 if it has a dropper - either way, we count it as a cube.
          else {
            cubeCount++;
            if (boxIsInDropper) hasCubeDropperThatCanDrop = true;
            // Check if this cube is specifically a reflector cube
            if (entity.classname === "prop_weighted_cube" && entity.cubetype == 2)
              containsReflectorCubeByRegion[regionNumber] = true;
          }
        }
      }

      // Find any laser emitters
      if (entity.classname === "env_portal_laser") {
        lasers.add(entity);
      }


      // Record all the regions containing a laser that can be turned on by a laser catcher or relay in this region

      // Check if this is a laser catcher or relay
      if (entity.classname === "prop_laser_catcher" || entity.classname === "prop_laser_relay") {
        // Loop over each laser that it can turn on
        const targetedEntityInputs = targetedEntityInputsByEntity.get(entity);
        for (const laserInput of targetedEntityInputs.filter(o =>
          o.entity.classname === "env_portal_laser" && (o.input === "toggle" || o.input === "turnon")
        )) {
          // Record the region of this laser
          const targetedLaserRegion = regionByCriticalEntity.get(laserInput.entity);
          regionsWithLasersActivatedByReceiverInGivenRegion[regionNumber].add(targetedLaserRegion);
        }
      }
    }

    if (hasExitLaserCatcherOrRelay) regionsWithExitLaserCatcherOrRelay.push(regionNumber);

    // Check whether this region has a laser that can activate before any other laser in the entire map
    // (meaning either it starts on or it can be activated without the requirement of another laser).
    const hasLaserThatStartsOn = [...lasers].some(laser => entireMapLasersThatStartOn.has(laser));
    const hasLaserThatCanBeTurnedOnWithoutLaserCatcherOrRelay = [...lasers].some(
      laser => entireMapLasersWithAnyConnection.has(laser) && !entireMapLasersWithCatcherOrRelayConnection.has(laser)
    );
    if (hasLaserThatStartsOn || hasLaserThatCanBeTurnedOnWithoutLaserCatcherOrRelay)
      regionsThatCouldBeFirstToActivateLaser.push(regionNumber);

    // --------------------------------------------------------------------------------------------------------------- //
    // CHECK WHETHER THIS REGION'S CONDITIONS CAN BE SATISFIED
    // --------------------------------------------------------------------------------------------------------------- //

    // The exit requires pressing a pedestal button in this region but this region is unreachable
    if (hasExitPedestalButton && !entranceRegionNumbers.has(regionNumber)) {
      return solvabilityGivenClosedExitDoorCannotBeOpened(hasStandardUnskippableExit);
    }

    // Each block can have up to 6 buttons that are required for the exit, and multiple can be
    // pressed down at a time by a single cube, sphere or player.
    // For each block, determine how many cubes and spheres are required, and how many more
    // "anything" are required ("anything" could be a cube, sphere or player).
    let wholeRegionCubesRequired = 0, wholeRegionSpheresRequired = 0, wholeRegionAnythingRequired = 0;
    for (const [block, allButtons] of exitAllButtonsByBlock) {
      const cubeButtons = exitCubeButtonsByBlock.get(block) ?? new Set();
      const sphereButtons = exitSphereButtonsByBlock.get(block) ?? new Set();
      let cubesRequired = 0, spheresRequired = 0;
      // Determine how many cubes are required for this block
      if (cubeButtons.size >= 1) {
        cubesRequired++;
        if (containsTwoOpposite(cubeButtons))
          cubesRequired++;
      }
      // Determine how many spheres are required for this block
      if (sphereButtons.size >= 1) {
        spheresRequired++;
        if (containsTwoOpposite(sphereButtons))
          spheresRequired++;
      }

      // Each cube and each sphere can press down up to 3 buttons
      const buttonsNotPressedYet = Math.max(0, allButtons.size - 3 * (cubesRequired + spheresRequired));
      // Each additional "anything" (cube, sphere or player) can press down up to 3 buttons
      let anythingRequired = Math.ceil(buttonsNotPressedYet / 3);
      // If there are just 2 buttons which are opposite each other, or there are just 3 buttons including
      // 2 opposite each other, then we need 2 items in total (1 item can't press down all of them)
      if (allButtons.size <= 3 && containsTwoOpposite(allButtons)) {
        if (cubesRequired + spheresRequired === 0) anythingRequired = 2;
        if (cubesRequired + spheresRequired === 1) anythingRequired = 1;
      }

      wholeRegionCubesRequired += cubesRequired;
      wholeRegionSpheresRequired += spheresRequired;
      wholeRegionAnythingRequired += anythingRequired;
    }

    // No cube dropper and not enough cubes to satisfy required cube buttons
    if (!hasCubeDropperThatCanDrop && cubeCount < wholeRegionCubesRequired) {
      return solvabilityGivenClosedExitDoorCannotBeOpened(hasStandardUnskippableExit);
    }

    // No sphere dropper and not enough spheres to satisfy required sphere buttons
    if (!hasSphereDropperThatCanDrop && sphereCount < wholeRegionSpheresRequired) {
      return solvabilityGivenClosedExitDoorCannotBeOpened(hasStandardUnskippableExit);
    }

    // If there are no cube droppers or sphere droppers,
    // then when the remaining cubes and spheres (after satisfying required cube buttons and sphere buttons)
    // are used to try to satisfy remaining required floor buttons,
    // then any left-over floor buttons must be satisfiable by a player sticking them (or, in some BEEmod
    // map types, standing on them and quickly passing through the exit door before it closes)
    if (!hasCubeDropperThatCanDrop && !hasSphereDropperThatCanDrop) {
      const availableCubes = cubeCount - wholeRegionCubesRequired;
      const availableSpheres = sphereCount - wholeRegionSpheresRequired;
      const remainingToBeStuck = Math.max(0, wholeRegionAnythingRequired - availableCubes - availableSpheres);

      let numPossibleSticks;
      // If this is the region reachable by the player, then after all cubes and spheres have been placed on as
      // many buttons as possible, the player can perform button sticks on additional buttons in this region to
      // open the exit door
      if (entranceRegionNumbers.has(regionNumber)) {
        // If it's singleplayer mode (without SLA):
        //   No more than one stick can be performed to open the exit door after all cubes and spheres have been
        //   placed on as many buttons as possible.
        //   If it's a standard PeTI map that has the exit door logic from before June 4 2012 or the exit door
        //   logic from June 4-6 2012, the exit door cannot be stuck open at all.
        // If it's cooperative mode:
        //   Maps with buttons targeting the exit door that can be stuck by the player have already been handled.
        if (!isBEEmodMap && entities.some(entity =>
          targetedEntityInputsByEntity.get(entity).some(t => t.entity.targetname === "doorexit1-relay_leaving_level")
        )) numPossibleSticks = 0;
        else numPossibleSticks = 1;
      }
      // If this is not the region reachable by the player, then no button sticks in this region can open the exit
      // door after all cubes and spheres have been placed on as many buttons as possible
      else numPossibleSticks = 0;

      // If not enough button sticks can be performed to satisfy the remaining required buttons in this region, the
      // exit door cannot be opened
      if (remainingToBeStuck > numPossibleSticks) {
        return solvabilityGivenClosedExitDoorCannotBeOpened(hasStandardUnskippableExit);
      }
    }
  }


  // --------------------------------------------------------------------------------------------------------------- //
  // SOLVABILITY CHECKS THAT APPLY ACROSS ALL REGIONS BUT USE DATA COLLECTED IN EACH REGION
  // --------------------------------------------------------------------------------------------------------------- //


  // Perform a breadth-first search across regions (not blocks), starting from all regions that
  // could be the first to have an enabled laser, and progressing to regions that have a laser that
  // can be activated by a laser receiver that's in a region reached by this search.
  // This will find all regions that can have an enabled laser.

  // If some region has a laser receiver that connects to the exit door but can never have an
  // enabled laser emitter, then the map is unsolvable... unless some region with a reflector cube
  // can have an enabled laser emitter - there is a chance the map may, without the player having to
  // touch the cube directly, make the cube point against a solid wall, causing the laser to pass
  // through one brush and enter another nearby region. This could make the map solvable without the
  // player needing to know the location of any separate region, so flag the map for manual review.

  const visited = new Array(numRegions).fill(false);
  for (const r of regionsThatCouldBeFirstToActivateLaser) visited[r] = true;
  const queue = regionsThatCouldBeFirstToActivateLaser;

  let activatedSomeLaserInRegionWithReflectorCube = false;

  let headOfQueue = 0;

  // Main breadth-first search loop
  while (headOfQueue < queue.length) {
    const cur = queue[headOfQueue++];
    if (containsReflectorCubeByRegion[cur])
      activatedSomeLaserInRegionWithReflectorCube = true;
    // Using the enabled laser in this region, see which other regions' lasers can be activated
    for (const next of regionsWithLasersActivatedByReceiverInGivenRegion[cur]) {
      if (!visited[next]) {
        visited[next] = true;
        queue.push(next);
      }
    }
  }
  if (regionsWithExitLaserCatcherOrRelay.some(region => !visited[region])) {
    if (activatedSomeLaserInRegionWithReflectorCube) {
      flagForManualReview("Sequence of laser activations requires reflector cube sending laser from one region to another");
      return true;
    }
    return solvabilityGivenClosedExitDoorCannotBeOpened(hasStandardUnskippableExit);
  }

  return true;

}

/**
 * Handles the `solvability` utility call. This utility is used to determine the solvability of maps.
 *
 * The following subcommands are available:
 * - `solvability`: Determine whether a map is solvable
 *
 * @param {string[]} args The arguments for the call
 * @param {unknown} context The context on which to execute the call (defaults to epochtal)
 * @returns {Promise<boolean>} The output of the call
 */
module.exports = async function (args, context = epochtal) {

  const [command, data] = args;
  switch (command) {
    case "solvability": {

      // Check the blacklist to filter out maps that are known to be unsolvable, or that are
      // known to have other playability issues that require them to be filtered out

      const mapid = data.publishedfileid;
      const blacklistSheetID = `1Xdr83G1aZqnh6s7SmbpuYeVjUB4qfev0W6__1GS5lTc`;
      try {

        // Fetch the blacklist
        const blacklistData = await fetch(`https://docs.google.com/spreadsheets/d/${blacklistSheetID}/gviz/tq`).then(r => r.text());

        // Parse the blacklist entries, each of which is a map link and a date&time
        function parseSheetDate (cell) {
          if (cell == null) return null;
          const match = String(cell.v).match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
          if (match == null) return null;
          return new Date(Date.UTC(+match[1], +match[2], +match[3], +(match[4] ?? 0), +(match[5] ?? 0), +(match[6] ?? 0)));
        }
        const blacklistJSON = JSON.parse(blacklistData.split(".setResponse(")[1].split(");")[0]);
        const blacklistEntries = blacklistJSON.table.rows.filter(r => r.c[0] != null).map(r => ({
          id: parseInt(r.c[0].v.split("id=").pop(), 10),
          date: parseSheetDate(r.c[1])
        }));

        // Check whether this map is on the blacklist
        const entry = blacklistEntries.find(e => e.id === parseInt(mapid, 10));
        if (entry) {
          // Only count the map as being blacklisted if the time given in its blacklist entry
          // is more than 24 hours after the map was last updated (24 hours is to avoid filtering
          // out maps that were last updated between the time when a verifier opened Portal 2
          // and the time when that verifier added the map to the blacklist)
          const mapLastUpdated = data.time_updated * 1000;
          const ONE_DAY_MS = 24 * 60 * 60 * 1000;
          if (entry.date != null && entry.date.getTime() > mapLastUpdated + ONE_DAY_MS) return false;
        }
      } catch (_) {
        // If the blacklist read fails, log an error but continue to the main solvability check
        new UtilError("ERR_BLACKLIST", args, context);
      }


      // Analyse the map to determine its solvability
      return isMapSolvable(data, context);

    }

  }

  throw new UtilError("ERR_COMMAND", args, context);

};
