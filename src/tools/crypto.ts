import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { Crypto } from "../types.js";

export function registerCryptoTools(server: McpServer) {
    server.tool(
        "get_all_crypto",
        "Get a list of all cryptocurrency assets associated with the user",
        {},
        async () => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            
            const response = await fetch(`${baseUrl}/crypto`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get crypto assets: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();
            const cryptoAssets: Crypto[] = data.crypto;
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(cryptoAssets),
                    },
                ],
            };
        }
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
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            
            const body: any = {};
            
            if (input.balance !== undefined) {
                body.balance = input.balance.toString();
            }
            
            const response = await fetch(`${baseUrl}/crypto/manual/${input.crypto_id}`, {
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
                            text: `Failed to update crypto asset: ${response.statusText}`,
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