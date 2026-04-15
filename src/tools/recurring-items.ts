import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api, dataResponse, handleApiError, catchError } from "../api.js";

export function registerRecurringItemsTools(server: McpServer) {
    server.registerTool(
        "get_recurring_items",
        {
            description:
                "Retrieve a list of recurring items expected for a specified date range. The `matches` object on each item is populated based on the requested range.",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .optional()
                    .describe(
                        "Start of the range used to populate `matches` (YYYY-MM-DD). Defaults to the current month. Required if end_date is set.",
                    ),
                end_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .optional()
                    .describe(
                        "End of the range used to populate `matches` (YYYY-MM-DD). Required if start_date is set.",
                    ),
                include_suggested: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, also returns recurring items suggested by the system that have not yet been reviewed.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ start_date, end_date, include_suggested }) => {
            try {
                const params = new URLSearchParams();
                if (start_date) params.append("start_date", start_date);
                if (end_date) params.append("end_date", end_date);
                if (include_suggested !== undefined)
                    params.append(
                        "include_suggested",
                        include_suggested.toString(),
                    );

                const qs = params.toString();
                const response = await api.get(
                    `/recurring_items${qs ? `?${qs}` : ""}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get recurring items",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get recurring items");
            }
        },
    );

    server.registerTool(
        "get_single_recurring_item",
        {
            description:
                "Retrieve a single recurring item by ID. Optional date range populates the `matches` object.",
            inputSchema: {
                recurringId: z.coerce
                    .number()
                    .describe(
                        "Id of the recurring item to query. Call get_recurring_items first to discover ids.",
                    ),
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .optional()
                    .describe(
                        "Start of the range used to populate `matches` (YYYY-MM-DD). Defaults to the current month. Required if end_date is set.",
                    ),
                end_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .optional()
                    .describe(
                        "End of the range used to populate `matches` (YYYY-MM-DD). Required if start_date is set.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ recurringId, start_date, end_date }) => {
            try {
                const params = new URLSearchParams();
                if (start_date) params.append("start_date", start_date);
                if (end_date) params.append("end_date", end_date);

                const qs = params.toString();
                const response = await api.get(
                    `/recurring_items/${recurringId}${qs ? `?${qs}` : ""}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get recurring item",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get recurring item");
            }
        },
    );
}
