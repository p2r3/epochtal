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

// Initialize popup and tooltip element behaviors
const popup = document.querySelector("#global-popup");
const tooltip = document.querySelector("#global-tooltip");

const [POPUP_INFO, POPUP_ERROR, POPUP_WARN] = [0, 1, 2];
if (popup) {

  function popupKeyHandler (event) {
    if (event.key === "Escape") popupOnCancel();
    if (event.key === "Enter") popupOnOkay();
  }
  
  const popupCloseEvent = new Event("close");

  const titleElement = document.querySelector("#global-popup-title");
  const textElement = document.querySelector("#global-popup-text");
  const cancelButton = document.querySelector("#global-popup-cancel");
 
  var showPopup = function (title, text, type = POPUP_INFO, hasCancel = false) {
  
    if (popup.style.opacity == 1) {
      popupOnCancel = hidePopup;
      popupOnOkay = hidePopup;
    }

    titleElement.innerHTML = title;
    textElement.innerHTML = text;

    if (hasCancel) cancelButton.style.display = "unset";
    else cancelButton.style.display = "none";
  
    popup.style.opacity = 1;
    popup.style.pointerEvents = "auto";
    popup.style.transform = "translate(-50%, -50%)";
  
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
  
    document.addEventListener("keydown", popupKeyHandler);
  
  };
  
  var hidePopup = function () {
  
    popup.style.opacity = 0;
    popup.style.pointerEvents = "none";
    popup.style.transform = "translate(-50%, 0)";
  
    document.removeEventListener("keydown", popupKeyHandler);
  
    popup.dispatchEvent(popupCloseEvent);
    
    popupOnCancel = hidePopup;
    popupOnOkay = hidePopup;
  
  };
  var popupOnCancel = hidePopup;
  var popupOnOkay = hidePopup;

}

if (tooltip) {

  var tooltipVisible = false, tooltipTimeout = null;
  var showTooltip = function (text) {
  
    tooltipVisible = true;
  
    tooltip.innerHTML = text;
    tooltip.style.opacity = 1;
  
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }

    // Hiding the tooltip is unituitive on touchscreen, so just fade it out on a timeout
    if ("ontouchstart" in window) {
      tooltipTimeout = setTimeout(hideTooltip, 5000);
    }

  };
  
  var hideTooltip = function (text) {
  
    tooltipVisible = false;
  
    tooltip.style.opacity = 0;
  
  };
  
  window.addEventListener("mousemove", function (event) {
  
    if (!tooltipVisible) return;
    
    const { clientX, clientY } = event;
    tooltip.style.transform = `translate(${clientX}px, ${clientY}px)`;
  
  });
  
}