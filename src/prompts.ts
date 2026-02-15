import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function lastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

export function registerPrompts(server: McpServer) {
    server.registerPrompt(
        "monthly_spending_breakdown",
        {
            description:
                "Analyze spending by category for a given month, combining transaction data with budget targets",
            argsSchema: {
                month: z
                    .string()
                    .optional()
                    .describe(
                        "Month to analyze in YYYY-MM format. Defaults to current month.",
                    ),
                currency: z
                    .string()
                    .optional()
                    .describe(
                        "Currency code to filter by (e.g. 'usd'). Defaults to all currencies.",
                    ),
            },
        },
        async ({ month, currency }) => {
            const now = new Date();
            const resolved =
                month ??
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const [y, m] = resolved.split("-").map(Number);
            const startDate = `${resolved}-01`;
            const endDate = `${resolved}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`;

            const currencyLine = currency
                ? `Use the currency filter "${currency}" when fetching transactions.`
                : "";

            return {
                messages: [
                    {
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: [
                                `Analyze my spending for ${resolved}.`,
                                "",
                                "Steps:",
                                `1. Call get_transactions with start_date="${startDate}" and end_date="${endDate}".${currencyLine ? " " + currencyLine : ""}`,
                                `2. Call get_budget_summary with start_date="${startDate}" and end_date="${endDate}".`,
                                "3. Group transactions by category and sum the amounts.",
                                "4. Compare actual spending against budgeted amounts where budgets exist.",
                                "5. Present a table with columns: Category, Spent, Budgeted, Remaining.",
                                "6. Highlight categories that are over budget.",
                                "7. Show total spent and total budgeted at the bottom.",
                            ].join("\n"),
                        },
                    },
                ],
            };
        },
    );

    server.registerPrompt(
        "subscription_audit",
        {
            description:
                "Review recurring items for a given month to audit subscriptions and recurring costs",
            argsSchema: {
                month: z
                    .string()
                    .optional()
                    .describe(
                        "Month to audit in YYYY-MM format. Defaults to current month.",
                    ),
            },
        },
        async ({ month }) => {
            const now = new Date();
            const resolved =
                month ??
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const [y, m] = resolved.split("-").map(Number);
            const startDate = `${resolved}-01`;
            const endDate = `${resolved}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`;

            return {
                messages: [
                    {
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: [
                                `Audit my subscriptions and recurring costs for ${resolved}.`,
                                "",
                                "Steps:",
                                `1. Call get_recurring_items with start_date="${startDate}" and end_date="${endDate}".`,
                                "2. List each recurring item with its name, amount, cadence, and category.",
                                "3. Sort by amount descending (most expensive first).",
                                "4. Calculate the total monthly cost of all recurring items.",
                                "5. Flag any items that seem duplicated or unusually expensive.",
                            ].join("\n"),
                        },
                    },
                ],
            };
        },
    );

    server.registerPrompt(
        "net_worth_snapshot",
        {
            description:
                "Calculate total net worth by combining manual assets, Plaid accounts, and crypto holdings",
        },
        async () => {
            return {
                messages: [
                    {
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: [
                                "Give me a snapshot of my current net worth.",
                                "",
                                "Steps:",
                                "1. Call get_all_assets to fetch manually-managed assets.",
                                "2. Call get_all_plaid_accounts to fetch linked bank accounts.",
                                "3. Call get_all_crypto to fetch cryptocurrency holdings.",
                                "4. Group accounts by type (cash, investment, property, crypto, debt, etc.).",
                                "5. Present a table with columns: Account Name, Type, Balance.",
                                "6. Show subtotals for each type.",
                                "7. Calculate total assets, total liabilities, and net worth.",
                            ].join("\n"),
                        },
                    },
                ],
            };
        },
    );

    server.registerPrompt(
        "uncategorized_cleanup",
        {
            description:
                "Find uncategorized transactions in a date range and suggest categories for them",
            argsSchema: {
                start_date: z
                    .string()
                    .optional()
                    .describe(
                        "Start date in YYYY-MM-DD format. Defaults to first day of current month.",
                    ),
                end_date: z
                    .string()
                    .optional()
                    .describe(
                        "End date in YYYY-MM-DD format. Defaults to last day of current month.",
                    ),
            },
        },
        async ({ start_date, end_date }) => {
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth() + 1;
            const resolvedStart =
                start_date ?? `${y}-${String(m).padStart(2, "0")}-01`;
            const resolvedEnd =
                end_date ??
                `${y}-${String(m).padStart(2, "0")}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`;

            return {
                messages: [
                    {
                        role: "user" as const,
                        content: {
                            type: "text" as const,
                            text: [
                                `Find and help me categorize uncategorized transactions from ${resolvedStart} to ${resolvedEnd}.`,
                                "",
                                "Steps:",
                                "1. Call get_all_categories to get the list of available categories.",
                                `2. Call get_transactions with start_date="${resolvedStart}" and end_date="${resolvedEnd}".`,
                                "3. Filter to only transactions that have no category assigned.",
                                "4. For each uncategorized transaction, suggest a category based on the payee name and amount.",
                                "5. Present the uncategorized transactions in a table with columns: Date, Payee, Amount, Suggested Category.",
                                "6. Ask me which suggestions to apply before calling update_transaction for each one.",
                            ].join("\n"),
                        },
                    },
                ],
            };
        },
    );
}
