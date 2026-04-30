import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiV1, dataResponse, handleApiError, catchError } from "../api.js";
import { CryptoAsset } from "../types.js";

export function registerCryptoTools(server: McpServer) {
    server.registerTool(
        "get_all_crypto",
        {
            description:
                "Get all cryptocurrency holdings from the v1 crypto endpoint. Returns both synced and manually managed crypto assets.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await apiV1.get("/crypto");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get crypto assets",
                    );
                }

                const data: { crypto: CryptoAsset[] } = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(error, "Failed to get crypto assets");
            }
        },
    );

    server.registerTool(
        "update_manual_crypto",
        {
            description:
                "Update a manually-managed crypto asset via the v1 crypto endpoint. The id must be from a get_all_crypto result with source=manual.",
            inputSchema: {
                crypto_id: z.coerce
                    .number()
                    .describe(
                        "ID of the manual crypto asset to update. Synced crypto assets cannot be updated.",
                    ),
                balance: z.coerce
                    .number()
                    .describe("Updated balance of the crypto account."),
                name: z
                    .string()
                    .max(45)
                    .optional()
                    .describe("Optional official or full name of the account."),
                display_name: z
                    .string()
                    .max(25)
                    .optional()
                    .describe("Optional display name for the account."),
                institution_name: z
                    .string()
                    .max(50)
                    .optional()
                    .describe("Optional provider that holds the asset."),
                currency: z
                    .string()
                    .optional()
                    .describe("Optional supported cryptocurrency code."),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            crypto_id,
            balance,
            name,
            display_name,
            institution_name,
            currency,
        }) => {
            try {
                const body: Record<string, unknown> = {
                    balance: balance.toString(),
                };

                if (name !== undefined) body.name = name;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;
                if (currency !== undefined) body.currency = currency;

                const response = await apiV1.put(
                    `/crypto/manual/${crypto_id}`,
                    body,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update crypto asset",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to update crypto asset");
            }
        },
    );
}
