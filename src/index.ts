import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
    name: "lunchmoney-mcp",
    version: "1.0.0",
    capabilities: {
        tools: {},
    },
});

(async () => {
    try {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Lunchmoney MCP Server running on stdio");
    } catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
})();
