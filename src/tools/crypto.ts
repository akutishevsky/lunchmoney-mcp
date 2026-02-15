import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { formatData } from "../format.js";
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
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(`${baseUrl}/crypto`, {
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                    },
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to get crypto assets",
                        ),
                    );
                }

                const data = await response.json();
                const cryptoAssets: Crypto[] = data.crypto;

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(cryptoAssets),
                        },
                    ],
                };
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
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const body: any = {};

                if (balance !== undefined) {
                    body.balance = balance.toString();
                }

                const response = await fetch(
                    `${baseUrl}/crypto/manual/${crypto_id}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body),
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to update crypto asset",
                        ),
                    );
                }

                const result = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(result),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to update crypto asset");
            }
        },
    );
}
