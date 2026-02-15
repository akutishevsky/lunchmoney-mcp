import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { formatData } from "../format.js";
import { RecurringItem } from "../types.js";

export function registerRecurringItemsTools(server: McpServer) {
    server.tool(
        "get_recurring_items",
        "Retrieve a list of recurring items to expect for a specified month",
        {
            start_date: z
                .string()
                .optional()
                .describe(
                    "Start date in YYYY-MM-DD format. Defaults to first day of current month",
                ),
            end_date: z
                .string()
                .optional()
                .describe("End date in YYYY-MM-DD format"),
            debit_as_negative: z
                .boolean()
                .optional()
                .describe("Pass true to return debit amounts as negative"),
        },
        async ({ start_date, end_date, debit_as_negative }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const params = new URLSearchParams();
                if (start_date) params.append("start_date", start_date);
                if (end_date) params.append("end_date", end_date);
                if (debit_as_negative !== undefined) {
                    params.append(
                        "debit_as_negative",
                        debit_as_negative.toString(),
                    );
                }

                const url = params.toString()
                    ? `${baseUrl}/recurring_items?${params}`
                    : `${baseUrl}/recurring_items`;

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                    },
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to get recurring items",
                        ),
                    );
                }

                const recurringItems: RecurringItem[] = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(recurringItems),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to get recurring items");
            }
        },
    );
}
