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
 * Converts demo ticks into minutes, seconds, and milliseconds
 *
 * @param {number} t The number of ticks
 * @returns {string[]} The formatted string array [minutes, seconds, milliseconds]
 */
function ticksToStringArray (t) {

  // Split the ticks into hours, minutes, and seconds
  let sec = t % 3600 / 60;
  const min = Math.floor(t / 3600).toString();
  const ms = (sec % 1).toFixed(3).slice(2);

  sec = (sec < 10 ? "0" : "") + Math.floor(sec).toString();

  return [min, sec, ms];

}

/**
 * Converts a string array of time to demo ticks
 *
 * @param {string[]} a The string array [hours, minutes, seconds]
 * @returns {int} The number of ticks
 */
function stringArrayToTicks (a) {

  a[0] = Math.abs(Number(a[0]));
  a[1] = Math.abs(Number(a[1]));
  a[2] = Math.abs(Number(a[2]));

  return Math.round(a[0] * 3600 + a[1] * 60 + a[2] * 0.06);

}

/**
 * Parses a string representation of time into demo ticks
 *
 * @param {string} str The string representation of time
 * @returns {int} The number of ticks
 */
function stringToTicks (str) {

  // Split string into array
  const arr = str.replace(/:/g, ".").replace(/,/g, ".").split(".");

  // Convert to ticks
  return stringArrayToTicks(arr);

}

/**
 * Cheaply URL-encode a string
 *
 * @param {string} str The string to encode
 * @returns {string} The encoded string
 */
function toHTMLString (str) {
  return str.toString().replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Initialize popup and tooltip element behaviors
const popup = document.querySelector("#global-popup");
const tooltip = document.querySelector("#global-tooltip");

const [POPUP_INFO, POPUP_ERROR, POPUP_WARN] = [0, 1, 2];
if (popup) {

  // Handle events in the popup
  function popupKeyHandler (event) {
    if (event.key === "Escape") popupOnCancel();
    if (event.key === "Enter") popupOnOkay();
  }

  const popupCloseEvent = new Event("close");

  const titleElement = document.querySelector("#global-popup-title");
  const textElement = document.querySelector("#global-popup-text");
  const cancelButton = document.querySelector("#global-popup-cancel");

  /**
   * Show a popup with the given title and text
   *
   * @param {string} title The title of the popup
   * @param {string} text The text of the popup
   * @param {POPUP_INFO, POPUP_ERROR, POPUP_WARN} type The type of popup
   * @param {boolean} hasCancel Whether the popup has a cancel button
   */
  var showPopup = function (title, text, type = POPUP_INFO, hasCancel = false) {

    // If the popup is already visible, set the cancel and okay functions to hide the popup
    if (popup.style.opacity == 1) {
      popupOnCancel = hidePopup;
      popupOnOkay = hidePopup;
    }

    // Set the title and text of the popup
    titleElement.innerHTML = title;
    textElement.innerHTML = text;

    // Show or hide the cancel button
    if (hasCancel) cancelButton.style.display = "unset";
    else cancelButton.style.display = "none";

    // Show the popup
    popup.style.opacity = 1;
    popup.style.pointerEvents = "auto";
    popup.style.transform = "translate(-50%, -50%)";

    // Set the border color based on the type
    switch (type) {
      case POPUP_INFO:
        popup.style.borderColor = "white";
        break;
      case POPUP_ERROR:
        popup.style.borderColor = "red";
        break;
      case POPUP_WARN:
        popup.style.borderColor = "#ff6400";
        break;

      default:
        popup.style.borderColor = "white";
        break;
    }

    // Add the key handler
    document.addEventListener("keydown", popupKeyHandler);

  };

  /**
   * Hide the popup
   */
  var hidePopup = function () {

    // Hide the popup
    popup.style.opacity = 0;
    popup.style.pointerEvents = "none";
    popup.style.transform = "translate(-50%, 0)";

    // Remove the key handler
    document.removeEventListener("keydown", popupKeyHandler);

    // Dispatch the close event
    popup.dispatchEvent(popupCloseEvent);

    // Reset the popup functions
    popupOnCancel = hidePopup;
    popupOnOkay = hidePopup;

  };

  // Set the initial popup functions
  var popupOnCancel = hidePopup;
  var popupOnOkay = hidePopup;

}

// Check if the tooltip element exists
if (tooltip) {

  var tooltipVisible = false, tooltipTimeout = null;

  /**
   * Displays a tooltip with the specified text
   *
   * @param {string} text The text to display in the tooltip
   */
  var showTooltip = function (text) {

    tooltipVisible = true;

    tooltip.innerHTML = text;
    tooltip.style.opacity = 1;

    // Reset tooltip timeout if it isn't null
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }

    // If the client is using a touchscreen, fade out the tooltip after 5 seconds - hiding the tooltip is unintuitive on touchscreen
    if ("ontouchstart" in window) {
      tooltipTimeout = setTimeout(hideTooltip, 5000);
    }

  };

  /**
   * Hides the tooltip from the user
   */
  var hideTooltip = function () {

    tooltipVisible = false;

    tooltip.style.opacity = 0;

  };

  // Move any visible tooltip to the mouse cursor's location
  window.addEventListener("mousemove", function (event) {

    if (!tooltipVisible) return;

    const { clientX, clientY } = event;
    tooltip.style.transform = `translate(${clientX}px, ${clientY}px)`;

  });

}

/**
 * Calculates the visibility percentage of an element within the viewport, considering specified offsets and margins.
 *
 * @param {HTMLElement} element The element to check for visibility.
 * @param {number} offsetbottom The offset to apply to the bottom of the viewport, effectively raising the bottom edge.
 * @param {number} marginbottom The bottom margin to consider for visibility calculation, applied after offset adjustments.
 * @param {number} margintop The top margin to consider for visibility calculation, applied after offset adjustments.
 * @param {number} offsettop The offset to apply to the top of the viewport, effectively lowering the top edge.
 * @returns {number} The visibility percentage of the element, constrained between 0 and 100.
 */
function inViewportPercent(element, offsetbottom = 0, marginbottom = 0, margintop = 0, offsettop = 0) {
  const rect = element.getBoundingClientRect();
  // Adjust window height by offsettop and offsetbottom
  const windowHeight = (window.innerHeight || document.documentElement.clientHeight);

  let top = windowHeight - rect.top;
  let bottom = rect.bottom;

  let topPercent = ((bottom - offsettop) * 100) / (margintop - offsettop);
  let bottomPercent = ((top - offsetbottom) * 100) / (marginbottom - offsetbottom);
  topPercent = Math.min(100, Math.max(0, topPercent));
  bottomPercent = Math.min(100, Math.max(0, bottomPercent));
  return Math.min(topPercent, bottomPercent);
}
