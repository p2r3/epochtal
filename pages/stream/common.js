/**
 * Requests a bunch of stuff for the ui to render and initializes WebSocket connection
 *
 * @returns {Promise<{leaderboard: Object, config: Object, users: Object, controllerSocket: WebSocket}>}
 */
async function initialSetup() {
  const leaderboard = await (await fetch("/api/leaderboard/get")).json();
  const config = await (await fetch("/api/config/get")).json();
  const users = await (await fetch("/api/users/get")).json();

  // Create the stream controller event topic if it doesn't exist
  await fetch("/util/events/create/streamController", {method: "POST"});
  // Connect to the event WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const controllerSocket = new WebSocket(`${protocol}://${window.location.host}/api/events/connect`);
  controllerSocket.onopen = async function (event) {
    const token = await (await fetch("/api/events/auth/streamController")).json();
    controllerSocket.send(token);
  };
  // Every 30 seconds, send an empty object as a sort of heartbeat ping
  setInterval(() => controllerSocket.send("{}"), 30000);

  /**
   * Sends WebSocket events to the stream controller event topic, which the UI, game, and controller listen to
   * @param {unknown} data Data to send, converted to a JSON string
   */
  window.sendToController = async function (data) {

    const dataString = encodeURIComponent(JSON.stringify(data));
    await fetch(`/util/events/send/streamController/${dataString}`, {method: "POST"});

  };

  return {leaderboard, config, users, controllerSocket};
}
