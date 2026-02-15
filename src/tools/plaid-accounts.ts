import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { PlaidAccount } from "../types.js";

export function registerPlaidAccountTools(server: McpServer) {
    server.tool(
        "get_all_plaid_accounts",
        "Get a list of all Plaid accounts associated with the user",
        {},
        async () => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(`${baseUrl}/plaid_accounts`, {
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                    },
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to get Plaid accounts"
                        )
                    );
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
            } catch (error) {
                return catchError(error, "Failed to get Plaid accounts");
            }
        }
    );

    server.tool(
        "trigger_plaid_fetch",
        "Trigger a fetch of latest data from Plaid (Experimental). Note that fetching may take up to 5 minutes.",
        {},
        async () => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(
                    `${baseUrl}/plaid_accounts/fetch`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                        },
                    }
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to trigger Plaid fetch"
                        )
                    );
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: "Plaid fetch triggered successfully. Fetching may take up to 5 minutes.",
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to trigger Plaid fetch");
            }
        }
    );
}
