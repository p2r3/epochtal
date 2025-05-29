/**
 * This object holds the global configuration of Epochtal that all parts of the application read from.
 * When Epochtal is started, this configuration is populated with data inherited from environment variables.
 * If parts of the configuration are not available as environment variables,
 * it will be populated with predefined default values where possible.
 *
 * @author Soni
 */
export const CONFIG: any = {
    /**
     * The filesystem directories in which non-volatile data is stored.
     */
    DIR: {
        /**
         * The directory to store runtime data in.
         * This includes user data, run data, category data, etc.
         */
        DATA: process.env.DATA_DIR ?? `${__dirname}/data`,
        /**
         * The directory to store binary dependencies in.
         * Epochtal will look for its dependencies in this directory.
         */
        BIN: process.env.BIN_DIR ?? `${__dirname}/bin`,
        /**
         * The directory to store runtime secrets in.
         * This includes curation weights and TLS keys.
         */
        SECRETS: process.env.SECRETS_DIR ?? `${__dirname}/secrets`
    },
    /**
     * The web URL of this deployed instance, including hostname and port, excluding protocol.
     * This is used to populate redirect URLs.
     *
     * NOTE: If running in a containerized manner,
     * make sure the port specified here is the publicly exposed port for the service.
     */
    WEB_URL: process.env.WEB_URL ?? "localhost:8080",
    /**
     * The port to run the Epochtal webserver on.
     */
    PORT: process.env.PORT ?? 8080,
    /**
     * Whether to host the webserver with TLS enabled.
     * If enabled, certificates need to be provided as `fullchain.pem` and `privkey.pem` in the SECRETS_DIR directory.
     */
    USE_TLS: process.env.USE_TLS === "true",
    /**
     * Whether clients are expected to connect to the exposed website with "https://"
     * (whether redirect URLs should be written with HTTPS instead of HTTP).
     * This will likely be the same as USE_TLS unless this deployment is exposed through a reverse proxy that terminates TLS.
     */
    USE_HTTPS: process.env.USE_HTTPS === "true"
}
