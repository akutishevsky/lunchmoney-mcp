import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { PlaidAccount } from "../types.js";

export function registerPlaidAccountTools(server: McpServer) {
    server.tool(
        "get_all_plaid_accounts",
        "Get a list of all Plaid accounts associated with the user",
        {},
        async () => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/plaid_accounts`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get Plaid accounts: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();
            const plaidAccounts: PlaidAccount[] = data.plaid_accounts;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(plaidAccounts),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_plaid_account",
        "Get a single Plaid account by ID",
        {
            input: z.object({
                account_id: z
                    .number()
                    .describe("ID of the Plaid account to retrieve"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/plaid_accounts/${input.account_id}`,
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
                            text: `Failed to get Plaid account: ${response.statusText}`,
                        },
                    ],
                };
            }

            const account: PlaidAccount = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(account),
                    },
                ],
            };
        }
    );

    server.tool(
        "trigger_plaid_fetch",
        "Trigger a fetch of latest data from Plaid (Experimental). Note that fetching may take up to 5 minutes.",
        {},
        async () => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            
            const response = await fetch(`${baseUrl}/plaid_accounts/fetch`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to trigger Plaid fetch: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();
            const plaidAccounts: PlaidAccount[] = data.plaid_accounts;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            message: "Plaid fetch triggered successfully. Fetching may take up to 5 minutes.",
                            plaid_accounts: plaidAccounts,
                        }),
                    },
                ],
            };
        }
    );
}