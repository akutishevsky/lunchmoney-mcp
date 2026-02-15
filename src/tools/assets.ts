import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api, dataResponse, handleApiError, catchError } from "../api.js";
import { Asset } from "../types.js";

export function registerAssetTools(server: McpServer) {
    server.registerTool(
        "get_all_assets",
        {
            description:
                "Get a list of all manually-managed assets associated with the user",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/assets");

                if (!response.ok) {
                    return handleApiError(response, "Failed to get assets");
                }

                const data = await response.json();
                const assets: Asset[] = data.assets;

                return dataResponse(assets);
            } catch (error) {
                return catchError(error, "Failed to get assets");
            }
        },
    );

    server.registerTool(
        "create_asset",
        {
            description: "Create a new manually-managed asset",
            inputSchema: {
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
                    .describe(
                        "Optional subtype (e.g., retirement, checking, savings)",
                    ),
                name: z.string().describe("Name of the asset"),
                display_name: z
                    .string()
                    .optional()
                    .describe("Display name of the asset (defaults to name)"),
                balance: z.number().describe("Current balance of the asset"),
                balance_as_of: z
                    .string()
                    .optional()
                    .describe(
                        "Date/time the balance is as of in ISO 8601 format",
                    ),
                currency: z
                    .string()
                    .optional()
                    .describe(
                        "Three-letter currency code (defaults to primary currency)",
                    ),
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
                    .describe(
                        "Whether to exclude this asset from transaction options",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({
            type_name,
            subtype_name,
            name,
            display_name,
            balance,
            balance_as_of,
            currency,
            institution_name,
            closed_on,
            exclude_transactions,
        }) => {
            try {
                const body: Record<string, unknown> = {
                    type_name,
                    name,
                    balance: balance.toString(),
                };

                if (subtype_name !== undefined)
                    body.subtype_name = subtype_name;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (balance_as_of !== undefined)
                    body.balance_as_of = balance_as_of;
                if (currency !== undefined) body.currency = currency;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;
                if (closed_on !== undefined) body.closed_on = closed_on;
                if (exclude_transactions !== undefined)
                    body.exclude_transactions = exclude_transactions;

                const response = await api.post("/assets", body);

                if (!response.ok) {
                    return handleApiError(response, "Failed to create asset");
                }

                const result = await response.json();

                return dataResponse(result);
            } catch (error) {
                return catchError(error, "Failed to create asset");
            }
        },
    );

    server.registerTool(
        "update_asset",
        {
            description: "Update an existing manually-managed asset",
            inputSchema: {
                asset_id: z.number().describe("ID of the asset to update"),
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
                    .describe(
                        "Optional subtype (e.g., retirement, checking, savings)",
                    ),
                name: z.string().optional().describe("Name of the asset"),
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
                    .describe(
                        "Date/time the balance is as of in ISO 8601 format",
                    ),
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
                    .describe(
                        "Whether to exclude this asset from transaction options",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            asset_id,
            type_name,
            subtype_name,
            name,
            display_name,
            balance,
            balance_as_of,
            currency,
            institution_name,
            closed_on,
            exclude_transactions,
        }) => {
            try {
                const body: Record<string, unknown> = {};

                if (type_name !== undefined) body.type_name = type_name;
                if (subtype_name !== undefined)
                    body.subtype_name = subtype_name;
                if (name !== undefined) body.name = name;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (balance !== undefined) body.balance = balance.toString();
                if (balance_as_of !== undefined)
                    body.balance_as_of = balance_as_of;
                if (currency !== undefined) body.currency = currency;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;
                if (closed_on !== undefined) body.closed_on = closed_on;
                if (exclude_transactions !== undefined)
                    body.exclude_transactions = exclude_transactions;

                const response = await api.put(`/assets/${asset_id}`, body);

                if (!response.ok) {
                    return handleApiError(response, "Failed to update asset");
                }

                const result = await response.json();

                return dataResponse(result);
            } catch (error) {
                return catchError(error, "Failed to update asset");
            }
        },
    );
}
