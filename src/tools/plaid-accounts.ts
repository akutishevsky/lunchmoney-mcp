import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
    api,
    dataResponse,
    successResponse,
    handleApiError,
    catchError,
} from "../api.js";
import { errorResponse } from "../errors.js";
import { id, isoDate } from "../schemas.js";

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
                accountId: id.describe(
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
                "Trigger a fetch of latest data from Plaid. An account is eligible only if its last_fetch is over 1 minute ago; calling again sooner returns 425 Too Early, so use this sparingly. Optionally scope the fetch to a date range (start_date and end_date must be provided together) and/or a specific Plaid account ID. The fetch runs as a background job, so the results are not immediate.",
            inputSchema: {
                start_date: isoDate
                    .optional()
                    .describe(
                        "Beginning of the date range to fetch transactions for (YYYY-MM-DD). If omitted, the most recent transactions are fetched. Required if end_date is set.",
                    ),
                end_date: isoDate
                    .optional()
                    .describe(
                        "End of the date range to fetch transactions for (YYYY-MM-DD). Required if start_date is set.",
                    ),
                id: id
                    .optional()
                    .describe(
                        "If set, only fetch the specified Plaid account; otherwise all eligible accounts are fetched.",
                    ),
            },
            annotations: {
                openWorldHint: true,
            },
        },
        async ({ start_date, end_date, id: accountId }) => {
            try {
                if ((start_date === undefined) !== (end_date === undefined)) {
                    return errorResponse(
                        "Failed to trigger Plaid fetch: start_date and end_date must be provided together.",
                    );
                }

                const params = new URLSearchParams();
                if (start_date) params.append("start_date", start_date);
                if (end_date) params.append("end_date", end_date);
                if (accountId !== undefined)
                    params.append("id", String(accountId));

                const qs = params.toString();
                const response = await api.post(
                    `/plaid_accounts/fetch${qs ? `?${qs}` : ""}`,
                );

                // 425 means LunchMoney has not yet made the account eligible again.
                if (response.status === 425) {
                    return errorResponse(
                        "Plaid fetch not started: LunchMoney accepts a fetch only for accounts whose last_fetch is over 1 minute ago (425 Too Early). Wait at least 60 seconds before triggering another fetch.",
                    );
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to trigger Plaid fetch",
                    );
                }

                return successResponse(
                    "Plaid fetch accepted (202) and queued as a background job. To verify, query get_all_plaid_accounts and check whether plaid_last_successful_update or last_import is more recent than the current last_fetch: a more recent plaid_last_successful_update means the institution was contacted, and a more recent last_import means new transactions were imported.",
                );
            } catch (error) {
                return catchError(error, "Failed to trigger Plaid fetch");
            }
        },
    );
}
