import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    successResponse,
    handleApiError,
    catchError,
} from "../api.js";
import { Budget } from "../types.js";

export function registerBudgetTools(server: McpServer) {
    server.registerTool(
        "get_budget_summary",
        {
            description:
                "Get budget summary for a specific date range. The budgeted and spending amounts will be broken down by month.",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe(
                        "Start date in YYYY-MM-DD format. Lunch Money currently only supports monthly budgets, so your date should be the start of a month (eg. 2021-04-01)",
                    ),
                end_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe(
                        "End date in YYYY-MM-DD format. Lunch Money currently only supports monthly budgets, so your date should be the end of a month (eg. 2021-04-30)",
                    ),
                currency: z
                    .string()
                    .length(3)
                    .optional()
                    .describe(
                        "Currency for budget (defaults to primary currency)",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ start_date, end_date, currency }) => {
            try {
                const params = new URLSearchParams({
                    start_date,
                    end_date,
                });

                if (currency) {
                    params.append("currency", currency);
                }

                const response = await api.get(`/budgets?${params}`);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get budget summary",
                    );
                }

                const budgets: Budget[] = await response.json();

                return dataResponse(budgets);
            } catch (error) {
                return catchError(error, "Failed to get budget summary");
            }
        },
    );

    server.registerTool(
        "upsert_budget",
        {
            description:
                "Create or update a budget for a specific category and month",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe("Budget month start date in YYYY-MM-DD format"),
                category_id: z.number().describe("Category ID for the budget"),
                amount: z.number().describe("Budget amount"),
                currency: z
                    .string()
                    .length(3)
                    .optional()
                    .describe(
                        "Currency for budget (defaults to primary currency)",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ start_date, category_id, amount, currency }) => {
            try {
                const body: Record<string, unknown> = {
                    start_date,
                    category_id,
                    amount,
                };

                if (currency) {
                    body.currency = currency;
                }

                const response = await api.put("/budgets", body);

                if (!response.ok) {
                    return handleApiError(response, "Failed to upsert budget");
                }

                const result = await response.json();

                return dataResponse(result);
            } catch (error) {
                return catchError(error, "Failed to upsert budget");
            }
        },
    );

    server.registerTool(
        "remove_budget",
        {
            description: "Remove a budget for a specific category and month",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe("Budget month start date in YYYY-MM-DD format"),
                category_id: z
                    .number()
                    .describe("Category ID for the budget to remove"),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ start_date, category_id }) => {
            try {
                const params = new URLSearchParams({
                    start_date,
                    category_id: category_id.toString(),
                });

                const response = await api.delete(`/budgets?${params}`);

                if (!response.ok) {
                    return handleApiError(response, "Failed to remove budget");
                }

                return successResponse("Budget removed successfully");
            } catch (error) {
                return catchError(error, "Failed to remove budget");
            }
        },
    );
}
