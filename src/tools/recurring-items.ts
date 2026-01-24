import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { RecurringItem } from "../types.js";

export function registerRecurringItemsTools(server: McpServer) {
    server.tool(
        "get_recurring_items",
        "Retrieve a list of recurring items to expect for a specified date range. Both start_date and end_date are required together.",
        {
            input: z.object({
                start_date: z
                    .string()
                    .describe("Start date in YYYY-MM-DD format (required with end_date)"),
                end_date: z
                    .string()
                    .describe("End date in YYYY-MM-DD format (required with start_date)"),
                include_suggested: z
                    .boolean()
                    .optional()
                    .describe("Include suggested recurring items"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const params = new URLSearchParams();
            params.append("start_date", input.start_date);
            params.append("end_date", input.end_date);
            if (input.include_suggested !== undefined) {
                params.append("include_suggested", input.include_suggested.toString());
            }

            const url = `${baseUrl}/recurring_items?${params}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get recurring items: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();
            const recurringItems: RecurringItem[] = data.recurring_items;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(recurringItems),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_single_recurring_item",
        "Get details of a specific recurring item",
        {
            input: z.object({
                recurring_id: z
                    .number()
                    .describe("ID of the recurring item to retrieve"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/recurring_items/${input.recurring_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                    },
                }
            );

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get recurring item: ${response.statusText}`,
                        },
                    ],
                };
            }

            const recurringItem: RecurringItem = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(recurringItem),
                    },
                ],
            };
        }
    );
}