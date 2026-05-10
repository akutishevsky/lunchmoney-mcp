import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUserTools } from "./tools/user.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerTagTools } from "./tools/tags.js";
import { registerTransactionTools } from "./tools/transactions.js";
import { registerRecurringItemsTools } from "./tools/recurring-items.js";
import { registerBudgetTools } from "./tools/budgets.js";
import { registerManualAccountTools } from "./tools/manual-accounts.js";
import { registerPlaidAccountTools } from "./tools/plaid-accounts.js";
import { registerCryptoTools } from "./tools/crypto.js";
import { registerPrompts } from "./prompts.js";

export function createServer(version: string): McpServer {
    const server = new McpServer({
        name: "lunchmoney-mcp",
        version,
    });

    registerUserTools(server);
    registerCategoryTools(server);
    registerTagTools(server);
    registerTransactionTools(server);
    registerRecurringItemsTools(server);
    registerBudgetTools(server);
    registerManualAccountTools(server);
    registerPlaidAccountTools(server);
    registerCryptoTools(server);
    registerPrompts(server);

    return server;
}
