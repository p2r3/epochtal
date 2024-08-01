/**
 * Initializes the SoundCloud widget and music player logic
 */
window.musicStartPlayer = async function () {

  const widgetElement = document.querySelector("#soundcloud");
  window.scWidget = SC.Widget(widgetElement);

  // Configure audio element properties and begin playback
  scWidget.setVolume(13);
  scWidget.play();

  // Retrieve track count for shuffling
  const trackCount = await new Promise(resolve => scWidget.getSounds(arr => resolve(arr.length)));

  /**
   * Exposes toggling player to global scope
   */
  window.musicTogglePause = function () { scWidget.toggle(); };

  /**
   * Defines what happens when a track ends or gets skipped
   */
  window.musicNextTrack = async function () {

    // Play a random track from the playlist, excluding the first one
    // The first track is treated as the "intro" and thus never repeats
    const nextTrackIndex = Math.floor(Math.random() * (trackCount - 1) + 1);
    scWidget.skip(nextTrackIndex);

    // Retrieve next track title and author
    const soundDetails = await new Promise(r => scWidget.getCurrentSound(s => r(s)));
    const trackName = soundDetails.title;
    const trackAuthor = soundDetails.user.username;

    // Update the controller on what track is playing
    window.sendToController({
      update: "musicName",
      trackname: trackName
    });

    // Display a popup on the stream UI
    const popup = document.querySelector("#musicplayer-container");
    const popupName = document.querySelector("#musicplayer-track-name");
    const popupAuthor = document.querySelector("#musicplayer-track-author");

    popupName.innerHTML = trackName;
    popupAuthor.innerHTML = trackAuthor;

    popup.style.transform = "translateY(0)";
    popup.style.opacity = 1;

    setTimeout(function () {
      popup.style.transform = "translateY(-100%)";
      popup.style.opacity = 0;
    }, 5000);

  };

  // Run the previously defined next track behavior when a track finishes
  scWidget.bind(SC.Widget.Events.FINISH, window.musicNextTrack);

  return scWidget;

};
