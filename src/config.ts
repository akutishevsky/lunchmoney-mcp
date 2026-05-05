interface Config {
    lunchmoneyApiToken: string;
    baseUrl: string;
}

let config: Config | null = null;

const initializeConfig = (lunchmoneyApiToken: string): Config => {
    if (!lunchmoneyApiToken) {
        throw new Error(
            "LunchMoney API token is required. Pass it to initializeConfig().",
        );
    }

    config = {
        lunchmoneyApiToken,
        baseUrl: "https://api.lunchmoney.dev/v2",
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

export { type Config, initializeConfig, getConfig };
