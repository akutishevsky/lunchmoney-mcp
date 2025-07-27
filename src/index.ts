import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeConfig } from "./config.js";
import { registerUserTools } from "./tools/user.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerTagTools } from "./tools/tags.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerRecurringItemsTools } from "./tools/recurring-items.js";
import { registerBudgetTools } from "./tools/budgets.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerPlaidAccountTools } from "./tools/plaid-accounts.js";
import { registerCryptoTools } from "./tools/crypto.js";

const server = new McpServer({
    name: "lunchmoney-mcp",
    version: "1.0.0",
    capabilities: {
        tools: {},
    },
});

registerUserTools(server);
registerCategoryTools(server);
registerTagTools(server);
registerTransactionTools(server);
registerRecurringItemsTools(server);
registerBudgetTools(server);
registerAssetTools(server);
registerPlaidAccountTools(server);
registerCryptoTools(server);

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
