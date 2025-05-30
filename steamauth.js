const openid = require("openid"); // OpenID is used together with Steam for authentication

/**
 * Class that handles authentication through Steam.
 *
 * @see https://steamcommunity.com/dev
 */
class SteamAuth {
  constructor ({ realm, returnUrl, apiKey }) {
    if (!realm || !returnUrl || !apiKey) {
      throw new Error(
        "Missing realm, returnURL or apiKey parameter(s). These are required."
      );
    }

    // These two attributes seem to never be used. Should they be removed?
    this.realm = realm;
    this.returnUrl = returnUrl;

    this.apiKey = apiKey;
    this.relyingParty = new openid.RelyingParty(
      returnUrl,
      realm,
      true,
      true,
      []
    );
  }

  /**
   * Gets the redirect URL for Steam.
   *
   * The promise gets rejected if the authentication fails.
   *
   * @returns {Promise<unknown>} The Steam redirect URL
   */
  async getRedirectUrl () {
    return new Promise((resolve, reject) => {
      this.relyingParty.authenticate(
        "https://steamcommunity.com/openid",
        false,
        (error, authUrl) => {
          if (error) return reject("Authentication failed: " + error);
          if (!authUrl) return reject("Authentication failed.");

          resolve(authUrl);
        }
      );
    });
  }

  /**
   * Fetches Steam user data.
   *
   * The promise gets rejected if there are no users with the given SteamID or if Steam returns any other errors. If the
   * latter is the case, the error will also be passed along as part of the rejection.
   *
   * @param {string} steamOpenId The user's 64-bit SteamID in full format (`https://steamcommunity.com/openid/id/&lt;steamid>`)
   * @returns {Promise<unknown>} The following user data:
   * - `_json`: All gathered information
   * - `steamid`: The user's SteamID
   * - `username`: The Steam username
   * - `name`: The real name of the user
   * - `profile`: The Steam profile URL
   * - `avatar`: An array containing the URLs of the user's avatar, in different sizes
   *
   * @see https://developer.valvesoftware.com/wiki/Steam_Web_API#GetPlayerSummaries_.28v0002.29
   */
  async fetchIdentifier (steamOpenId) {
    return new Promise(async (resolve, reject) => {
      // Parse SteamID from the URL
      const steamId = steamOpenId.replace(
        "https://steamcommunity.com/openid/id/",
        ""
      );

      try {
        // Query the Steam API with the SteamID
        const response = { data: await (await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${this.apiKey}&steamids=${steamId}`
        )).json() };
        const players =
          response.data &&
          response.data.response &&
          response.data.response.players;

        if (players && players.length > 0) {
          // Get the player
          const player = players[0];

          // Return user data
          resolve({
            _json: player,
            steamid: steamId,
            username: player.personaname,
            name: player.realname,
            profile: player.profileurl,
            avatar: {
              small: player.avatar,
              medium: player.avatarmedium,
              large: player.avatarfull
            }
          });
        } else {
          reject("No players found for the given SteamID.");
        }
      } catch (error) {
        reject("Steam server error: " + error.message);
      }
    });
  }

  /**
   * Authenticates the user.
   *
   * The promise gets rejected if the user does not authenticate properly or if the claimed identity is invalid.
   *
   * @param {HttpRequest} req The request to verify
   * @returns {Promise<unknown>} The authenticated user and all relevant user data
   */
  async authenticate (req) {
    return new Promise((resolve, reject) => {
      // Verify assertion
      this.relyingParty.verifyAssertion(req, async (error, result) => {
        if (error) return reject(error.message);
        if (!result || !result.authenticated) {
          return reject("Failed to authenticate user.");
        }

        // Check if the claimed identity is valid
        if (
          !/^https?:\/\/steamcommunity\.com\/openid\/id\/\d+$/.test(
            result.claimedIdentifier
          )
        ) {
          return reject("Claimed identity is not valid.");
        }

        // Try to get the user data
        try {
          const user = await this.fetchIdentifier(result.claimedIdentifier);
          return resolve(user);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

// Export class
module.exports = SteamAuth;
