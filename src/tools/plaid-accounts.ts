import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    successResponse,
    handleApiError,
    catchError,
} from "../api.js";

export function registerPlaidAccountTools(server: McpServer) {
    server.registerTool(
        "get_all_plaid_accounts",
        {
            description:
                "Get a list of all Plaid (synced) accounts associated with the user.",
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

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get Plaid accounts");
            }
        },
    );

    server.registerTool(
        "get_single_plaid_account",
        {
            description:
                "Get details of a single Plaid (synced) account by ID.",
            inputSchema: {
                accountId: z.coerce
                    .number()
                    .describe(
                        "Id of the Plaid account to query. Call get_all_plaid_accounts first to discover ids.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ accountId }) => {
            try {
                const response = await api.get(`/plaid_accounts/${accountId}`);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get Plaid account",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get Plaid account");
            }
        },
    );

    server.registerTool(
        "trigger_plaid_fetch",
        {
            description:
                "Trigger a fetch of latest data from Plaid. Optionally scope the fetch to a date range and/or a specific Plaid account ID. Note: Plaid enforces a minimum 60-second delay between fetch requests; fetching may take up to 5 minutes.",
            inputSchema: {
                start_date: z
                    .string()
                    .optional()
                    .describe(
                        "Beginning of the date range to fetch transactions for (YYYY-MM-DD). Required if end_date is set.",
                    ),
                end_date: z
                    .string()
                    .optional()
                    .describe(
                        "End of the date range to fetch transactions for (YYYY-MM-DD). Required if start_date is set.",
                    ),
                id: z.coerce
                    .number()
                    .optional()
                    .describe(
                        "If set, only fetch the specified Plaid account; otherwise all eligible accounts are fetched.",
                    ),
            },
            annotations: {
                openWorldHint: true,
            },
        },
        async ({ start_date, end_date, id }) => {
            try {
                const params = new URLSearchParams();
                if (start_date) params.append("start_date", start_date);
                if (end_date) params.append("end_date", end_date);
                if (id !== undefined) params.append("id", String(id));

                const qs = params.toString();
                const response = await api.post(
                    `/plaid_accounts/fetch${qs ? `?${qs}` : ""}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to trigger Plaid fetch",
                    );
                }

                return successResponse(
                    "Plaid fetch accepted. Fetching may take up to 5 minutes; query get_all_plaid_accounts to check plaid_last_successful_update / last_import.",
                );
            } catch (error) {
                return catchError(error, "Failed to trigger Plaid fetch");
            }
        },
    );
}
