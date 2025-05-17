export const CONFIG: any = {
    DIR: {
        DATA: process.env.DATA_DIR ?? `${__dirname}/data`,
        BIN: process.env.BIN_DIR ?? `${__dirname}/bin`,
        SECRETS: process.env.SECRETS_DIR ?? `${__dirname}/secrets`
    },
    WEB_URL: process.env.WEB_URL ?? "localhost:8080",
    PORT: process.env.PORT ?? 8080,
    USE_TLS: process.env.USE_TLS === "true",
    USE_HTTPS: process.env.USE_HTTPS === "true"
}
