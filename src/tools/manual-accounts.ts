import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    handleApiError,
    catchError,
    successResponse,
} from "../api.js";

const manualAccountTypeEnum = z.enum([
    "cash",
    "credit",
    "cryptocurrency",
    "employee compensation",
    "investment",
    "loan",
    "other liability",
    "other asset",
    "real estate",
    "vehicle",
]);

export function registerManualAccountTools(server: McpServer) {
    server.registerTool(
        "get_all_manual_accounts",
        {
            description:
                "Get a list of all manually-managed accounts associated with the user. (Formerly known as `assets` in the v1 API.)",
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
                        "Failed to get manual accounts",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get manual accounts");
            }
        },
    );

    server.registerTool(
        "get_single_manual_account",
        {
            description: "Get details of a single manual account by ID.",
            inputSchema: {
                accountId: z.coerce
                    .number()
                    .describe(
                        "Id of the manual account to query. Call get_all_manual_accounts first to discover ids.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ accountId }) => {
            try {
                const response = await api.get(`/manual_accounts/${accountId}`);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get manual account",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get manual account");
            }
        },
    );

    server.registerTool(
        "create_manual_account",
        {
            description:
                "Create a new manually-managed account. (Formerly `create_asset`.)",
            inputSchema: {
                type: manualAccountTypeEnum.describe(
                    "Primary type of the manual account.",
                ),
                subtype: z
                    .string()
                    .optional()
                    .describe(
                        "Optional subtype (e.g., retirement, checking, savings).",
                    ),
                name: z
                    .string()
                    .min(1)
                    .max(45)
                    .describe("Name of the account. 1-45 characters."),
                display_name: z
                    .string()
                    .optional()
                    .describe(
                        "Display name. If unset, derived from institution_name and name.",
                    ),
                balance: z.coerce
                    .number()
                    .describe("Current balance of the account."),
                balance_as_of: z
                    .string()
                    .optional()
                    .describe(
                        "Date or datetime the balance is as of (ISO 8601).",
                    ),
                currency: z
                    .string()
                    .length(3)
                    .optional()
                    .describe(
                        "Three-letter lowercase currency code (defaults to primary currency).",
                    ),
                institution_name: z
                    .string()
                    .optional()
                    .describe("Name of the institution holding the account."),
                closed_on: z
                    .string()
                    .optional()
                    .describe(
                        "Date the account was closed (YYYY-MM-DD). If set, status is forced to closed.",
                    ),
                exclude_from_transactions: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, transactions cannot be assigned to this account.",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({
            type,
            subtype,
            name,
            display_name,
            balance,
            balance_as_of,
            currency,
            institution_name,
            closed_on,
            exclude_from_transactions,
        }) => {
            try {
                const body: Record<string, unknown> = {
                    type,
                    name,
                    balance: balance.toString(),
                };

                if (subtype !== undefined) body.subtype = subtype;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (balance_as_of !== undefined)
                    body.balance_as_of = balance_as_of;
                if (currency !== undefined) body.currency = currency;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;
                if (closed_on !== undefined) body.closed_on = closed_on;
                if (exclude_from_transactions !== undefined)
                    body.exclude_from_transactions = exclude_from_transactions;

                const response = await api.post("/manual_accounts", body);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to create manual account",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to create manual account");
            }
        },
    );

    server.registerTool(
        "update_manual_account",
        {
            description:
                "Update an existing manually-managed account. (Formerly `update_asset`.)",
            inputSchema: {
                accountId: z.coerce
                    .number()
                    .describe("Id of the manual account to update."),
                type: manualAccountTypeEnum.optional(),
                subtype: z.string().optional(),
                name: z.string().min(1).max(45).optional(),
                display_name: z.string().nullable().optional(),
                balance: z.coerce.number().optional(),
                balance_as_of: z.string().optional(),
                currency: z.string().length(3).optional(),
                institution_name: z.string().nullable().optional(),
                closed_on: z.string().nullable().optional(),
                exclude_from_transactions: z.boolean().optional(),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            accountId,
            type,
            subtype,
            name,
            display_name,
            balance,
            balance_as_of,
            currency,
            institution_name,
            closed_on,
            exclude_from_transactions,
        }) => {
            try {
                const body: Record<string, unknown> = {};

                if (type !== undefined) body.type = type;
                if (subtype !== undefined) body.subtype = subtype;
                if (name !== undefined) body.name = name;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (balance !== undefined) body.balance = balance.toString();
                if (balance_as_of !== undefined)
                    body.balance_as_of = balance_as_of;
                if (currency !== undefined) body.currency = currency;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;
                if (closed_on !== undefined) body.closed_on = closed_on;
                if (exclude_from_transactions !== undefined)
                    body.exclude_from_transactions = exclude_from_transactions;

                const response = await api.put(
                    `/manual_accounts/${accountId}`,
                    body,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update manual account",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to update manual account");
            }
        },
    );

    server.registerTool(
        "delete_manual_account",
        {
            description:
                "Delete a manually-managed account. Optionally also delete its transactions/rules/recurring items, and/or its balance history. Both deletion options are irreversible.",
            inputSchema: {
                accountId: z.coerce
                    .number()
                    .describe("Id of the manual account to delete."),
                delete_items: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, also deletes any transactions, rules, and recurring items associated with this account.",
                    ),
                delete_balance_history: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, also deletes any balance history associated with this account.",
                    ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ accountId, delete_items, delete_balance_history }) => {
            try {
                const params = new URLSearchParams();
                if (delete_items)
                    params.append("delete_items", String(delete_items));
                if (delete_balance_history)
                    params.append(
                        "delete_balance_history",
                        String(delete_balance_history),
                    );

                const qs = params.toString();
                const response = await api.delete(
                    `/manual_accounts/${accountId}${qs ? `?${qs}` : ""}`,
                );

                if (response.status === 204) {
                    return successResponse("Manual account deleted.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete manual account",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to delete manual account");
            }
        },
    );
}
