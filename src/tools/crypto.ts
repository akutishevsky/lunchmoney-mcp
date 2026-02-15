import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api, dataResponse, handleApiError, catchError } from "../api.js";
import { Crypto } from "../types.js";

export function registerCryptoTools(server: McpServer) {
    server.registerTool(
        "get_all_crypto",
        {
            description:
                "Get a list of all cryptocurrency assets associated with the user",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/crypto");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get crypto assets",
                    );
                }

                const data = await response.json();
                const cryptoAssets: Crypto[] = data.crypto;

                return dataResponse(cryptoAssets);
            } catch (error) {
                return catchError(error, "Failed to get crypto assets");
            }
        },
    );

    server.registerTool(
        "update_manual_crypto",
        {
            description:
                "Update a manually-managed cryptocurrency asset balance",
            inputSchema: {
                crypto_id: z
                    .number()
                    .describe("ID of the crypto asset to update"),
                balance: z
                    .number()
                    .optional()
                    .describe("Updated balance of the crypto asset"),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ crypto_id, balance }) => {
            try {
                const body: Record<string, unknown> = {};

                if (balance !== undefined) {
                    body.balance = balance.toString();
                }

                const response = await api.put(
                    `/crypto/manual/${crypto_id}`,
                    body,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update crypto asset",
                    );
                }

                const result = await response.json();

                return dataResponse(result);
            } catch (error) {
                return catchError(error, "Failed to update crypto asset");
            }
        },
    );
}
