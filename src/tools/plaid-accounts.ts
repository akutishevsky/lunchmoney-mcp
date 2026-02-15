import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    api,
    dataResponse,
    successResponse,
    handleApiError,
    catchError,
} from "../api.js";
import { PlaidAccount } from "../types.js";

export function registerPlaidAccountTools(server: McpServer) {
    server.registerTool(
        "get_all_plaid_accounts",
        {
            description:
                "Get a list of all Plaid accounts associated with the user",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/plaid_accounts");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get Plaid accounts",
                    );
                }

                const data = await response.json();
                const plaidAccounts: PlaidAccount[] = data.plaid_accounts;

                return dataResponse(plaidAccounts);
            } catch (error) {
                return catchError(error, "Failed to get Plaid accounts");
            }
        },
    );

    server.registerTool(
        "trigger_plaid_fetch",
        {
            description:
                "Trigger a fetch of latest data from Plaid (Experimental). Note that fetching may take up to 5 minutes.",
            annotations: {
                openWorldHint: true,
            },
        },
        async () => {
            try {
                const response = await api.post("/plaid_accounts/fetch");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to trigger Plaid fetch",
                    );
                }

                return successResponse(
                    "Plaid fetch triggered successfully. Fetching may take up to 5 minutes.",
                );
            } catch (error) {
                return catchError(error, "Failed to trigger Plaid fetch");
            }
        },
    );
}
