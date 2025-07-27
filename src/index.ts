import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Config, initializeConfig, getConfig } from "./config.js";
import { User, CategoryChild, Category } from "./types.js";

const server = new McpServer({
    name: "lunchmoney-mcp",
    version: "1.0.0",
    capabilities: {
        tools: {},
    },
});

server.tool("get_user", "Get details on the current user", {}, async () => {
    const { baseUrl, lunchmoneyApiToken } = getConfig();
    const response = await fetch(`${baseUrl}/me`, {
        headers: {
            Authorization: `Bearer ${lunchmoneyApiToken}`,
        },
    });

    if (!response.ok) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to get user details: ${response.statusText}`,
                },
            ],
        };
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(await response.json()),
            },
        ],
    };
});

(async () => {
    try {
        initializeConfig();

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Lunchmoney MCP Server running on stdio");
    } catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
})();
