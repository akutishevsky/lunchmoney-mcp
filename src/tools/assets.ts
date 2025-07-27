import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { Asset } from "../types.js";

export function registerAssetTools(server: McpServer) {
    server.tool(
        "get_all_assets",
        "Get a list of all manually-managed assets associated with the user",
        {},
        async () => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            
            const response = await fetch(`${baseUrl}/assets`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get assets: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();
            const assets: Asset[] = data.assets;
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(assets),
                    },
                ],
            };
        }
    );

    server.tool(
        "create_asset",
        "Create a new manually-managed asset",
        {
            input: z.object({
                type_name: z
                    .enum([
                        "cash",
                        "credit",
                        "investment",
                        "real estate",
                        "loan",
                        "vehicle",
                        "cryptocurrency",
                        "employee compensation",
                        "other liability",
                        "other asset",
                    ])
                    .describe("Primary type of the asset"),
                subtype_name: z
                    .string()
                    .optional()
                    .describe("Optional subtype (e.g., retirement, checking, savings)"),
                name: z
                    .string()
                    .describe("Name of the asset"),
                display_name: z
                    .string()
                    .optional()
                    .describe("Display name of the asset (defaults to name)"),
                balance: z
                    .number()
                    .describe("Current balance of the asset"),
                balance_as_of: z
                    .string()
                    .optional()
                    .describe("Date/time the balance is as of in ISO 8601 format"),
                currency: z
                    .string()
                    .optional()
                    .describe("Three-letter currency code (defaults to primary currency)"),
                institution_name: z
                    .string()
                    .optional()
                    .describe("Name of the institution holding the asset"),
                closed_on: z
                    .string()
                    .optional()
                    .describe("Date the asset was closed in YYYY-MM-DD format"),
                exclude_transactions: z
                    .boolean()
                    .optional()
                    .describe("Whether to exclude this asset from transaction options"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            
            const body: any = {
                type_name: input.type_name,
                name: input.name,
                balance: input.balance.toString(),
            };
            
            if (input.subtype_name) body.subtype_name = input.subtype_name;
            if (input.display_name) body.display_name = input.display_name;
            if (input.balance_as_of) body.balance_as_of = input.balance_as_of;
            if (input.currency) body.currency = input.currency;
            if (input.institution_name) body.institution_name = input.institution_name;
            if (input.closed_on) body.closed_on = input.closed_on;
            if (input.exclude_transactions !== undefined) body.exclude_transactions = input.exclude_transactions;
            
            const response = await fetch(`${baseUrl}/assets`, {
                method: "POST",
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
                            text: `Failed to create asset: ${response.statusText}`,
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
        "update_asset",
        "Update an existing manually-managed asset",
        {
            input: z.object({
                asset_id: z
                    .number()
                    .describe("ID of the asset to update"),
                type_name: z
                    .enum([
                        "cash",
                        "credit",
                        "investment",
                        "real estate",
                        "loan",
                        "vehicle",
                        "cryptocurrency",
                        "employee compensation",
                        "other liability",
                        "other asset",
                    ])
                    .optional()
                    .describe("Primary type of the asset"),
                subtype_name: z
                    .string()
                    .optional()
                    .describe("Optional subtype (e.g., retirement, checking, savings)"),
                name: z
                    .string()
                    .optional()
                    .describe("Name of the asset"),
                display_name: z
                    .string()
                    .optional()
                    .describe("Display name of the asset"),
                balance: z
                    .number()
                    .optional()
                    .describe("Current balance of the asset"),
                balance_as_of: z
                    .string()
                    .optional()
                    .describe("Date/time the balance is as of in ISO 8601 format"),
                currency: z
                    .string()
                    .optional()
                    .describe("Three-letter currency code"),
                institution_name: z
                    .string()
                    .optional()
                    .describe("Name of the institution holding the asset"),
                closed_on: z
                    .string()
                    .optional()
                    .describe("Date the asset was closed in YYYY-MM-DD format"),
                exclude_transactions: z
                    .boolean()
                    .optional()
                    .describe("Whether to exclude this asset from transaction options"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            
            const body: any = {};
            
            if (input.type_name) body.type_name = input.type_name;
            if (input.subtype_name) body.subtype_name = input.subtype_name;
            if (input.name) body.name = input.name;
            if (input.display_name) body.display_name = input.display_name;
            if (input.balance !== undefined) body.balance = input.balance.toString();
            if (input.balance_as_of) body.balance_as_of = input.balance_as_of;
            if (input.currency) body.currency = input.currency;
            if (input.institution_name) body.institution_name = input.institution_name;
            if (input.closed_on) body.closed_on = input.closed_on;
            if (input.exclude_transactions !== undefined) body.exclude_transactions = input.exclude_transactions;
            
            const response = await fetch(`${baseUrl}/assets/${input.asset_id}`, {
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
                            text: `Failed to update asset: ${response.statusText}`,
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
}