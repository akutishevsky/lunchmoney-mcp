import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    handleApiError,
    catchError,
    errorResponse,
} from "../api.js";
import { id, isoDate } from "../schemas.js";

export function registerRecurringItemsTools(server: McpServer) {
    server.registerTool(
        "get_recurring_items",
        {
            description:
                "Retrieve a list of recurring items expected for a specified date range. The `matches` object on each item is populated based on the requested range and is null for suggested items.",
            inputSchema: {
                start_date: isoDate
                    .optional()
                    .describe(
                        "Start of the range used to populate `matches` (YYYY-MM-DD). Defaults to the current month. Must be provided together with end_date.",
                    ),
                end_date: isoDate
                    .optional()
                    .describe(
                        "End of the range used to populate `matches` (YYYY-MM-DD). Must be provided together with start_date.",
                    ),
                include_suggested: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, also returns recurring items suggested by the system that have not yet been reviewed. Suggested items do not update matching transactions until reviewed.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ start_date, end_date, include_suggested }) => {
            try {
                if ((start_date === undefined) !== (end_date === undefined)) {
                    return errorResponse(
                        "Failed to get recurring items: start_date and end_date must be provided together.",
                    );
                }

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
                recurringId: id.describe(
                    "Id of the recurring item to query. Call get_recurring_items first to discover ids.",
                ),
                start_date: isoDate
                    .optional()
                    .describe(
                        "Start of the range used to populate `matches` (YYYY-MM-DD). Defaults to the current month. Must be provided together with end_date.",
                    ),
                end_date: isoDate
                    .optional()
                    .describe(
                        "End of the range used to populate `matches` (YYYY-MM-DD). Must be provided together with start_date.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ recurringId, start_date, end_date }) => {
            try {
                if ((start_date === undefined) !== (end_date === undefined)) {
                    return errorResponse(
                        "Failed to get recurring item: start_date and end_date must be provided together.",
                    );
                }

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
