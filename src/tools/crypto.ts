import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { formatData } from "../format.js";
import { Crypto } from "../types.js";

export function registerCryptoTools(server: McpServer) {
    server.tool(
        "get_all_crypto",
        "Get a list of all cryptocurrency assets associated with the user",
        {},
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

    server.tool(
        "update_manual_crypto",
        "Update a manually-managed cryptocurrency asset balance",
        {
            input: z.object({
                crypto_id: z
                    .number()
                    .describe("ID of the crypto asset to update"),
                balance: z
                    .number()
                    .optional()
                    .describe("Updated balance of the crypto asset"),
            }),
        },
        async ({ input }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const body: any = {};

                if (input.balance !== undefined) {
                    body.balance = input.balance.toString();
                }

                const response = await fetch(
                    `${baseUrl}/crypto/manual/${input.crypto_id}`,
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
