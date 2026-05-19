interface Config {
    lunchmoneyApiToken: string;
    baseUrl: string;
}

let config: Config | null = null;

/**
 * Set the LunchMoney API token used by every tool in this package.
 *
 * Must be called before `createServer()` is connected to a transport, or
 * before any individual tool is invoked.
 *
 * ⚠️ Single-tenant assumption: the config is stored in a module-level
 * singleton, so two concurrent requests in the same process can race and
 * read each other's tokens. This is safe on per-isolate runtimes
 * (Cloudflare Workers + Durable Objects, AWS Lambda) and on single-user
 * stdio deployments. It is NOT safe on shared-process multi-tenant hosts
 * (e.g. a single Node process serving multiple users via Express or Hono);
 * those consumers need to either fork per-user or refactor the singleton
 * before exposing this package.
 *
 * @param lunchmoneyApiToken - Personal API token from
 *   https://my.lunchmoney.app/developers.
 * @throws If `lunchmoneyApiToken` is empty.
 */
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
