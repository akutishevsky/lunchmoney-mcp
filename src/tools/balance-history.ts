import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    handleApiError,
    catchError,
    successResponse,
    errorResponse,
} from "../api.js";
import { amount, currency, id } from "../schemas.js";

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthSchema = z
    .string()
    .regex(MONTH_PATTERN, "Month must be in YYYY-MM format (e.g. 2026-01)");

// The spec types crypto_balance as a string only, with no number branch, so
// unlike the shared cryptoBalance validator this one rejects JSON numbers.
const cryptoBalanceString = z
    .string()
    .regex(
        /^-?\d+(\.\d{1,18})?$/,
        "Crypto balance must be numeric with at most 18 decimal places.",
    );

const startMonthSchema = monthSchema
    .optional()
    .describe(
        "Optional first month of the range, inclusive, as YYYY-MM (e.g. 2026-01). Must not be in the future. If set, end_month is also required. A full date such as 2026-01-01 is invalid.",
    );

const endMonthSchema = monthSchema
    .optional()
    .describe(
        "Optional last month of the range, inclusive, as YYYY-MM (e.g. 2026-03). Must not be earlier than start_month and must not be in the future. If set, start_month is also required. For a single month, use the same value as start_month.",
    );

const accountTypeSchema = z
    .enum(["manual", "plaid", "crypto_manual", "deleted"])
    .describe(
        "Type of account the balance history belongs to. Use manual for manually-managed accounts, plaid for synced bank accounts, crypto_manual for manually-managed crypto, and deleted for accounts that no longer exist but still have history. Synced crypto uses the dedicated crypto_synced tools instead.",
    );

const balancesSchema = z
    .array(
        z.object({
            id: id
                .optional()
                .describe(
                    "Optional historical balance entry id. Accepted for input shaped like a balance history response and ignored by the server.",
                ),
            month: monthSchema.describe(
                "Month the balance applies to, as YYYY-MM. Must be a past calendar month — the current month cannot be written.",
            ),
            balance: amount.describe(
                "Balance for the month, as a number or a numeric string with up to 4 decimal places (a string keeps exact precision). In the account currency for manual and Plaid accounts, or the user's primary currency for crypto and deleted accounts.",
            ),
            to_base: z
                .number()
                .optional()
                .describe(
                    "Optional converted balance. Accepted for input shaped like a balance history response and ignored by the server, which recalculates it from balance.",
                ),
            currency: currency
                .optional()
                .describe(
                    "Optional three-letter currency code (case-insensitive, e.g. usd). Defaults to the account currency for manual and Plaid accounts, or the user's primary currency for crypto and deleted accounts.",
                ),
            symbol: z
                .string()
                .min(1)
                .max(25)
                .nullable()
                .optional()
                .describe(
                    "Optional ticker symbol (e.g. btc). Allowed for crypto_manual and deleted accounts; if set, it must match the account's symbol. Must not be sent for manual or plaid accounts. On the synced crypto tool it must match the symbol argument. May be null.",
                ),
            crypto_balance: cryptoBalanceString
                .nullable()
                .optional()
                .describe(
                    "Optional quantity of the coin itself, as a numeric string with up to 18 decimal places. Only valid for crypto_manual, crypto_synced, and deleted accounts; must not be sent for manual or plaid accounts. May be null.",
                ),
        }),
    )
    .min(1)
    .describe(
        "One or more monthly balance entries to create or update. If any entry fails validation the entire request is rejected and nothing is updated.",
    );

type BalanceInput = z.infer<typeof balancesSchema>[number];

function buildUpsertBody(balances: BalanceInput[]) {
    return {
        balances: balances.map((entry) => {
            const item: Record<string, unknown> = {
                month: entry.month,
                balance: entry.balance,
            };
            if (entry.id !== undefined) item.id = entry.id;
            if (entry.to_base !== undefined) item.to_base = entry.to_base;
            if (entry.currency !== undefined) item.currency = entry.currency;
            if (entry.symbol !== undefined) item.symbol = entry.symbol;
            if (entry.crypto_balance !== undefined)
                item.crypto_balance = entry.crypto_balance;
            return item;
        }),
    };
}

function buildMonthQuery(start_month?: string, end_month?: string): string {
    const params = new URLSearchParams();
    if (start_month !== undefined) params.append("start_month", start_month);
    if (end_month !== undefined) params.append("end_month", end_month);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
}

// Both months must be given together, and end_month cannot precede start_month.
// Months are validated as YYYY-MM first, so string comparison orders them.
function monthRangeError(start_month?: string, end_month?: string) {
    if ((start_month === undefined) !== (end_month === undefined)) {
        return "start_month and end_month must either both be provided or both be omitted.";
    }
    if (
        start_month !== undefined &&
        end_month !== undefined &&
        end_month < start_month
    ) {
        return "end_month must not be earlier than start_month.";
    }
    return null;
}

// null counts as absent for the cross-field rules below, since the spec marks
// symbol and crypto_balance nullable.
function isSet<T>(value: T | null | undefined): value is T {
    return value !== undefined && value !== null;
}

// The spec forbids symbol and crypto_balance on manual and Plaid accounts.
function manualBalanceFieldsError(
    account_type: string,
    balances: BalanceInput[],
) {
    if (account_type !== "manual" && account_type !== "plaid") return null;
    const offending = balances.some(
        (entry) => isSet(entry.symbol) || isSet(entry.crypto_balance),
    );
    return offending
        ? `symbol and crypto_balance must not be sent for ${account_type} accounts. Omit them for manual and Plaid balances.`
        : null;
}

// The spec allows symbol on synced crypto entries only if it matches the path.
function syncedSymbolError(symbol: string, balances: BalanceInput[]) {
    const mismatch = balances.find(
        (entry) => isSet(entry.symbol) && entry.symbol !== symbol,
    );
    return mismatch
        ? `symbol "${mismatch.symbol}" does not match the symbol argument "${symbol}". Omit symbol on entries or make it match.`
        : null;
}

export function registerBalanceHistoryTools(server: McpServer) {
    server.registerTool(
        "get_balance_history",
        {
            description:
                "Get monthly account balance history across all accounts — the data behind the Net Worth views in the LunchMoney app. History is monthly. With no month range, returns all available history plus an ephemeral `current` entry for the current month, which is calculated on demand and may change between requests. Only months with data are included.",
            inputSchema: {
                start_month: startMonthSchema,
                end_month: endMonthSchema,
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ start_month, end_month }) => {
            try {
                const rangeError = monthRangeError(start_month, end_month);
                if (rangeError) {
                    return errorResponse(
                        `Failed to get balance history: ${rangeError}`,
                    );
                }

                const response = await api.get(
                    `/balance_history${buildMonthQuery(start_month, end_month)}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get balance history",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get balance history");
            }
        },
    );

    server.registerTool(
        "get_account_balance_history",
        {
            description:
                "Get monthly balance history for a single account. Call get_all_manual_accounts, get_all_plaid_accounts, or get_all_manual_crypto first to discover ids. For deleted accounts, use the deleted_account_id from get_balance_history. For synced crypto holdings use get_crypto_synced_balance_history instead.",
            inputSchema: {
                account_type: accountTypeSchema,
                account_id: id.describe(
                    "Id of the account to get balance history for. For deleted accounts, pass the deleted_account_id.",
                ),
                start_month: startMonthSchema,
                end_month: endMonthSchema,
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ account_type, account_id, start_month, end_month }) => {
            try {
                const rangeError = monthRangeError(start_month, end_month);
                if (rangeError) {
                    return errorResponse(
                        `Failed to get account balance history: ${rangeError}`,
                    );
                }

                const response = await api.get(
                    `/balance_history/${account_type}/${account_id}${buildMonthQuery(
                        start_month,
                        end_month,
                    )}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get account balance history",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to get account balance history",
                );
            }
        },
    );

    server.registerTool(
        "upsert_account_balance_history",
        {
            description:
                "Create or update monthly balance history entries for a single account. Every month must be a past calendar month — the current month is calculated on demand and cannot be written. The request is all-or-nothing: if any entry fails validation, none are applied. The response contains only the entries submitted, not the account's full history.",
            inputSchema: {
                account_type: accountTypeSchema,
                account_id: id.describe(
                    "Id of the account to write balance history for. For deleted accounts, pass the deleted_account_id.",
                ),
                balances: balancesSchema,
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ account_type, account_id, balances }) => {
            try {
                const fieldError = manualBalanceFieldsError(
                    account_type,
                    balances,
                );
                if (fieldError) {
                    return errorResponse(
                        `Failed to update account balance history: ${fieldError}`,
                    );
                }

                const response = await api.put(
                    `/balance_history/${account_type}/${account_id}`,
                    buildUpsertBody(balances),
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update account balance history",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to update account balance history",
                );
            }
        },
    );

    server.registerTool(
        "delete_account_balance_history",
        {
            description:
                "Delete ALL historical balance entries for a single account. This is irreversible and affects the Net Worth views. To remove a single month, use delete_balance_history_entry instead.",
            inputSchema: {
                account_type: accountTypeSchema,
                account_id: id.describe(
                    "Id of the account whose entire balance history should be deleted. For deleted accounts, pass the deleted_account_id.",
                ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ account_type, account_id }) => {
            try {
                const response = await api.delete(
                    `/balance_history/${account_type}/${account_id}`,
                );

                if (response.status === 204) {
                    return successResponse("Account balance history deleted.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete account balance history",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to delete account balance history",
                );
            }
        },
    );

    server.registerTool(
        "get_crypto_synced_balance_history",
        {
            description:
                "Get monthly balance history for a synced crypto holding, identified by its account id and ticker symbol. Synced crypto is scoped per symbol, so it is not available through get_account_balance_history.",
            inputSchema: {
                account_id: id.describe("Id of the synced crypto account."),
                symbol: z
                    .string()
                    .min(1)
                    .max(25)
                    .describe(
                        "Ticker symbol of the holding within the account (e.g. eth).",
                    ),
                start_month: startMonthSchema,
                end_month: endMonthSchema,
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ account_id, symbol, start_month, end_month }) => {
            try {
                const rangeError = monthRangeError(start_month, end_month);
                if (rangeError) {
                    return errorResponse(
                        `Failed to get synced crypto balance history: ${rangeError}`,
                    );
                }

                const response = await api.get(
                    `/balance_history/crypto_synced/${account_id}/${encodeURIComponent(
                        symbol,
                    )}${buildMonthQuery(start_month, end_month)}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get synced crypto balance history",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to get synced crypto balance history",
                );
            }
        },
    );

    server.registerTool(
        "upsert_crypto_synced_balance_history",
        {
            description:
                "Create or update monthly balance history entries for a synced crypto holding. Every month must be a past calendar month. If an entry sets `symbol`, it must match the symbol argument. The request is all-or-nothing.",
            inputSchema: {
                account_id: id.describe("Id of the synced crypto account."),
                symbol: z
                    .string()
                    .min(1)
                    .max(25)
                    .describe(
                        "Ticker symbol of the holding within the account (e.g. eth).",
                    ),
                balances: balancesSchema,
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ account_id, symbol, balances }) => {
            try {
                const symbolError = syncedSymbolError(symbol, balances);
                if (symbolError) {
                    return errorResponse(
                        `Failed to update synced crypto balance history: ${symbolError}`,
                    );
                }

                const response = await api.put(
                    `/balance_history/crypto_synced/${account_id}/${encodeURIComponent(
                        symbol,
                    )}`,
                    buildUpsertBody(balances),
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update synced crypto balance history",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to update synced crypto balance history",
                );
            }
        },
    );

    server.registerTool(
        "delete_crypto_synced_balance_history",
        {
            description:
                "Delete ALL historical balance entries for a synced crypto holding. This is irreversible and affects the Net Worth views.",
            inputSchema: {
                account_id: id.describe("Id of the synced crypto account."),
                symbol: z
                    .string()
                    .min(1)
                    .max(25)
                    .describe(
                        "Ticker symbol of the holding whose history should be deleted (e.g. eth).",
                    ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ account_id, symbol }) => {
            try {
                const response = await api.delete(
                    `/balance_history/crypto_synced/${account_id}/${encodeURIComponent(
                        symbol,
                    )}`,
                );

                if (response.status === 204) {
                    return successResponse(
                        "Synced crypto balance history deleted.",
                    );
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete synced crypto balance history",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to delete synced crypto balance history",
                );
            }
        },
    );

    server.registerTool(
        "delete_balance_history_entry",
        {
            description:
                "Delete a single historical balance entry by its id. The id must come from an entry with type=historical in a balance history response; ephemeral `current` entries have no id and cannot be deleted.",
            inputSchema: {
                entry_id: id.describe(
                    "Id of the historical balance entry to delete. Call get_balance_history or get_account_balance_history first to discover ids.",
                ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ entry_id }) => {
            try {
                const response = await api.delete(
                    `/balance_history/entries/${entry_id}`,
                );

                if (response.status === 204) {
                    return successResponse("Balance history entry deleted.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete balance history entry",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to delete balance history entry",
                );
            }
        },
    );

    server.registerTool(
        "update_deleted_account_details",
        {
            description:
                "Update the display details shown for a deleted account in the Net Worth views. Applies to all historical entries for that deleted source. At least one field must be provided; pass null to clear a field.",
            inputSchema: {
                account_id: id.describe(
                    "The deleted_account_id from a balance history entry whose source type is `deleted`.",
                ),
                name: z
                    .string()
                    .nullable()
                    .optional()
                    .describe("Official or full name of the deleted account."),
                institution_name: z
                    .string()
                    .nullable()
                    .optional()
                    .describe(
                        "Name of the institution that held the deleted account.",
                    ),
                display_name: z
                    .string()
                    .nullable()
                    .optional()
                    .describe("Display name for the deleted account."),
                account_type: z
                    .string()
                    .nullable()
                    .optional()
                    .describe("Type of the deleted account."),
                subtype: z
                    .string()
                    .nullable()
                    .optional()
                    .describe("Subtype of the deleted account."),
                mask: z
                    .string()
                    .nullable()
                    .optional()
                    .describe(
                        "Last few digits of the deleted account's number.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            account_id,
            name,
            institution_name,
            display_name,
            account_type,
            subtype,
            mask,
        }) => {
            try {
                const body: Record<string, unknown> = {};

                if (name !== undefined) body.name = name;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (account_type !== undefined)
                    body.account_type = account_type;
                if (subtype !== undefined) body.subtype = subtype;
                if (mask !== undefined) body.mask = mask;

                if (Object.keys(body).length === 0) {
                    return errorResponse(
                        "Failed to update deleted account details: at least one property must be provided: name, institution_name, display_name, account_type, subtype, mask.",
                    );
                }

                const response = await api.put(
                    `/balance_history/deleted/${account_id}/details`,
                    body,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update deleted account details",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to update deleted account details",
                );
            }
        },
    );
}
