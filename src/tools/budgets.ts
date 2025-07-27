import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { Budget } from "../types.js";

export function registerBudgetTools(server: McpServer) {
    server.tool(
        "get_budget_summary",
        "Get budget summary for a specific date range. The budgeted and spending amounts will be broken down by month.",
        {
            input: z.object({
                start_date: z
                    .string()
                    .describe(
                        "Start date in YYYY-MM-DD format. Lunch Money currently only supports monthly budgets, so your date should be the start of a month (eg. 2021-04-01)"
                    ),
                end_date: z
                    .string()
                    .describe(
                        "End date in YYYY-MM-DD format. Lunch Money currently only supports monthly budgets, so your date should be the end of a month (eg. 2021-04-30)"
                    ),
                currency: z
                    .string()
                    .optional()
                    .describe(
                        "Currency for budget (defaults to primary currency)"
                    ),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const params = new URLSearchParams({
                start_date: input.start_date,
                end_date: input.end_date,
            });

            if (input.currency) {
                params.append("currency", input.currency);
            }

            const response = await fetch(`${baseUrl}/budgets?${params}`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get budget summary: ${response.statusText}`,
                        },
                    ],
                };
            }

            const budgets: Budget[] = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(budgets),
                    },
                ],
            };
        }
    );

    server.tool(
        "upsert_budget",
        "Create or update a budget for a specific category and month",
        {
            input: z.object({
                start_date: z
                    .string()
                    .describe("Budget month start date in YYYY-MM-DD format"),
                category_id: z.number().describe("Category ID for the budget"),
                amount: z.number().describe("Budget amount"),
                currency: z
                    .string()
                    .optional()
                    .describe(
                        "Currency for budget (defaults to primary currency)"
                    ),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const body: any = {
                start_date: input.start_date,
                category_id: input.category_id,
                amount: input.amount,
            };

            if (input.currency) {
                body.currency = input.currency;
            }

            const response = await fetch(`${baseUrl}/budgets`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to upsert budget: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "remove_budget",
        "Remove a budget for a specific category and month",
        {
            input: z.object({
                start_date: z
                    .string()
                    .describe("Budget month start date in YYYY-MM-DD format"),
                category_id: z
                    .number()
                    .describe("Category ID for the budget to remove"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const params = new URLSearchParams({
                start_date: input.start_date,
                category_id: input.category_id.toString(),
            });

            const response = await fetch(`${baseUrl}/budgets?${params}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to remove budget: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: "Budget removed successfully",
                    },
                ],
            };
        }
    );
}
