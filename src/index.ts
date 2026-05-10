#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { initializeConfig } from "./config.js";
import { createServer } from "./server.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

(async () => {
    try {
        initializeConfig();

        const server = createServer(version);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Lunchmoney MCP Server running on stdio");

        const shutdown = async () => {
            console.error("Shutting down Lunchmoney MCP Server...");
            await server.close();
            process.exit(0);
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    } catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
})();
