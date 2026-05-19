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

/**
 * Build a configured `McpServer` with all LunchMoney tools and prompts registered.
 *
 * `initializeConfig(token)` from `./config` must be called before any tool is
 * invoked. The returned server is wired up but inert — actual API calls go
 * through the module-level config singleton, which throws
 * `"Configuration not initialized. Call initializeConfig() first."` on the
 * first tool invocation if no token has been set.
 *
 * @param version - Version string surfaced to MCP clients as `serverInfo.version`.
 */
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
