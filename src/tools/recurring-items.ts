import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api, dataResponse, handleApiError, catchError } from "../api.js";
import { RecurringItem } from "../types.js";

export function registerRecurringItemsTools(server: McpServer) {
    server.registerTool(
        "get_recurring_items",
        {
            description:
                "Retrieve a list of recurring items to expect for a specified month",
            inputSchema: {
                start_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .optional()
                    .describe(
                        "Start date in YYYY-MM-DD format. Defaults to first day of current month",
                    ),
                end_date: z
                    .string()
                    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
                    .optional()
                    .describe("End date in YYYY-MM-DD format"),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe("Pass true to return debit amounts as negative"),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ start_date, end_date, debit_as_negative }) => {
            try {
                const params = new URLSearchParams();
                if (start_date) params.append("start_date", start_date);
                if (end_date) params.append("end_date", end_date);
                if (debit_as_negative !== undefined) {
                    params.append(
                        "debit_as_negative",
                        debit_as_negative.toString(),
                    );
                }

                const query = params.toString();
                const path = query
                    ? `/recurring_items?${query}`
                    : "/recurring_items";

                const response = await api.get(path);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get recurring items",
                    );
                }

                const recurringItems: RecurringItem[] = await response.json();

                return dataResponse(recurringItems);
            } catch (error) {
                return catchError(error, "Failed to get recurring items");
            }
        },
    );
}
