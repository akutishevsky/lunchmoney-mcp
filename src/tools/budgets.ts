import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    successResponse,
    handleApiError,
    catchError,
} from "../api.js";

export function registerBudgetTools(server: McpServer) {
    server.registerTool(
        "get_budget_summary",
        {
            description:
                "Get a summary of the user's budget for a specified date range. Returns per-category totals (other_activity, recurring_activity, budgeted, available, recurring_remaining, recurring_expected). Set include_occurrences=true for a per-period breakdown matching the account's budget periodicity. (Backed by the v2 GET /summary endpoint.)",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe(
                        "Start date in YYYY-MM-DD format. For aligned results use a valid budget period start (e.g. first day of month).",
                    ),
                end_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe(
                        "End date in YYYY-MM-DD format. For aligned results use a valid budget period end (e.g. last day of month).",
                    ),
                include_exclude_from_budgets: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include categories that have the 'Exclude from Budgets' flag set in the returned categories array.",
                    ),
                include_occurrences: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include an `occurrences` array on each category, with one entry per budget period in the range.",
                    ),
                include_past_budget_dates: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include the three budget occurrences prior to start_date in `occurrences`. Ignored unless include_occurrences is also true.",
                    ),
                include_totals: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include a top-level `totals` section summarizing inflow and outflow across all transactions in the range.",
                    ),
                include_rollover_pool: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include a `rollover_pool` section summarizing the current rollover pool balance and previous adjustments.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({
            start_date,
            end_date,
            include_exclude_from_budgets,
            include_occurrences,
            include_past_budget_dates,
            include_totals,
            include_rollover_pool,
        }) => {
            try {
                const params = new URLSearchParams({
                    start_date,
                    end_date,
                });
                if (include_exclude_from_budgets !== undefined)
                    params.append(
                        "include_exclude_from_budgets",
                        String(include_exclude_from_budgets),
                    );
                if (include_occurrences !== undefined)
                    params.append(
                        "include_occurrences",
                        String(include_occurrences),
                    );
                if (include_past_budget_dates !== undefined)
                    params.append(
                        "include_past_budget_dates",
                        String(include_past_budget_dates),
                    );
                if (include_totals !== undefined)
                    params.append("include_totals", String(include_totals));
                if (include_rollover_pool !== undefined)
                    params.append(
                        "include_rollover_pool",
                        String(include_rollover_pool),
                    );

                const response = await api.get(`/summary?${params}`);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get budget summary",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get budget summary");
            }
        },
    );

    server.registerTool(
        "get_budget_settings",
        {
            description:
                "Get budget period and display settings for the account (granularity, period length, anchor date, hide-no-activity preference, income option, rollover-left-to-budget setting).",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/budgets/settings");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get budget settings",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get budget settings");
            }
        },
    );

    server.registerTool(
        "upsert_budget",
        {
            description:
                "Create or update a budget for a category and budget period. The start_date must be a valid budget period start for the account (see get_budget_settings).",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe(
                        "Budget period start date in YYYY-MM-DD format. Must be a valid budget period start; if not, the API returns the previous and next valid start dates.",
                    ),
                category_id: z.coerce
                    .number()
                    .describe("Category ID for the budget."),
                amount: z.coerce.number().describe("Budget amount."),
                currency: z
                    .string()
                    .length(3)
                    .optional()
                    .describe(
                        "Three-letter lowercase currency code (defaults to primary currency).",
                    ),
                notes: z
                    .string()
                    .max(350)
                    .optional()
                    .describe("Optional notes for the budget period."),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ start_date, category_id, amount, currency, notes }) => {
            try {
                const body: Record<string, unknown> = {
                    start_date,
                    category_id,
                    amount,
                };

                if (currency) body.currency = currency;
                if (notes !== undefined) body.notes = notes;

                const response = await api.put("/budgets", body);

                if (!response.ok) {
                    return handleApiError(response, "Failed to upsert budget");
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to upsert budget");
            }
        },
    );

    server.registerTool(
        "remove_budget",
        {
            description:
                "Remove the budget for a specific category and period. The request is idempotent — succeeds even if no budget exists for the period.",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .describe(
                        "Budget period start date in YYYY-MM-DD format. Must be a valid budget period start.",
                    ),
                category_id: z.coerce
                    .number()
                    .describe("Category ID for the budget to remove."),
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

                return successResponse("Budget removed.");
            } catch (error) {
                return catchError(error, "Failed to remove budget");
            }
        },
    );
}
