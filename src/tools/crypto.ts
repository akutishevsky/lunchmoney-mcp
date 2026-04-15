import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { api, dataResponse, handleApiError, catchError } from "../api.js";
import { ManualAccount } from "../types.js";

export function registerCryptoTools(server: McpServer) {
    server.registerTool(
        "get_all_crypto",
        {
            description:
                "Get a list of cryptocurrency holdings. v2 has no dedicated /crypto endpoint; this tool queries /manual_accounts and filters to accounts with type=cryptocurrency. Use create_manual_account / update_manual_account / delete_manual_account for full management.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/manual_accounts");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get crypto assets",
                    );
                }

                const data: { manual_accounts: ManualAccount[] } =
                    await response.json();
                const crypto = data.manual_accounts.filter(
                    (a) => a.type === "cryptocurrency",
                );

                return dataResponse({ crypto });
            } catch (error) {
                return catchError(error, "Failed to get crypto assets");
            }
        },
    );

    server.registerTool(
        "update_manual_crypto",
        {
            description:
                "Update a manually-managed cryptocurrency account's balance. v2 has no dedicated /crypto/manual endpoint; this tool calls PUT /manual_accounts/{id}. The id must reference an account with type=cryptocurrency.",
            inputSchema: {
                crypto_id: z.coerce
                    .number()
                    .describe(
                        "ID of the manual account (with type=cryptocurrency) to update.",
                    ),
                balance: z.coerce
                    .number()
                    .describe("Updated balance of the crypto account."),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ crypto_id, balance }) => {
            try {
                const response = await api.put(
                    `/manual_accounts/${crypto_id}`,
                    {
                        balance: balance.toString(),
                    },
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
