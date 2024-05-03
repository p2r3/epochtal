const UtilError = require("./error.js");

/*
  Injects a logic_script entity into the BSP for initializing co-op VScript.
  First, we just sort of assume that the entity lump begins wherever the first "220a7d0a7b0a22" sequence is.
  Then, we replace those characters with coopstr below.
  To make up for the file size difference, we remove unnecessary 0A characters from the entity lump.
  To do this, we replace 23 sequences of "220a7d0a7b0a22" with "227d7b22", which hopefully doesn't break anything.
*/

const fs = require("fs");

// This translates to the string `"}{\x0Aclassname logic_script\x0Avscripts debug_scripts/mp_coop_transition_list}{"`
const coopstr = "227d7b0a636c6173736e616d65206c6f6769635f7363726970740a76736372697074732064656275675f736372697074732f6d705f636f6f705f7472616e736974696f6e5f6c6973747d7b22";

module.exports = async function (args) {

  const [filename] = args;
  if (!filename) throw new UtilError("ERR_FILE", args, { name: null });

  try {
    
    fs.closeSync(fs.openSync(filename + ".coop", "w"));
  
    const stream = fs.createReadStream(filename, { encoding: "hex" });
  
    let injected = false, replaced = 0;
  
    await new Promise(function (resolve) {
  
      stream.on("data", function (chunk) {

        if (!injected && chunk.indexOf("220a7d0a7b0a22") !== -1) {
          chunk = chunk.replace("220a7d0a7b0a22", coopstr);
          injected = true;
        }
  
        while (replaced < 23 && chunk.indexOf("220a7d0a7b0a22") !== -1) {
          chunk = chunk.replace("220a7d0a7b0a22", "227d7b22");
          replaced ++;
        }
  
        fs.appendFileSync(filename + ".coop", chunk, { encoding: "hex" });
  
      });
  
      stream.on("end", function () {
        stream.close();
        resolve();
      });
  
    });

    if (replaced !== 23) {
      fs.rmSync(filename + ".coop");
      return false;
    }

    fs.renameSync(filename + ".coop", filename);
    return true;

  } catch (err) {

    console.log(err);
    return false;

  }

}
