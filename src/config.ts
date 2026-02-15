interface Config {
    lunchmoneyApiToken: string;
    baseUrl: string;
}

let config: Config | null = null;

const initializeConfig = (): Config => {
    if (!process.env.LUNCHMONEY_API_TOKEN) {
        throw new Error(
            "Failed to get the LUNCHMONEY_API_TOKEN. Probably it wasn't added during the server configuration.",
        );
    }

    config = {
        lunchmoneyApiToken: process.env.LUNCHMONEY_API_TOKEN,
        baseUrl: "https://dev.lunchmoney.app/v1",
    };

    return config;
};

const getConfig = (): Config => {
    if (!config) {
        throw new Error(
            "Configuration not initialized. Call initializeConfig() first.",
        );
    }
    return config;
};

export { Config, initializeConfig, getConfig };
