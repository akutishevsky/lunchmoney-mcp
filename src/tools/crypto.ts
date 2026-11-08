import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    handleApiError,
    catchError,
    errorResponse,
    successResponse,
} from "../api.js";
import {
    Cryptocurrency,
    ManualCrypto,
    SyncedCryptoAccount,
    SyncedCryptoBalance,
} from "../types.js";
import { cryptoBalance, id } from "../schemas.js";

export function registerCryptoTools(server: McpServer) {
    server.registerTool(
        "get_supported_cryptocurrencies",
        {
            description:
                "Get the list of cryptocurrencies supported for manual tracking. The `symbol` of an entry here is what must be passed to create_manual_crypto.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/cryptocurrencies");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get supported cryptocurrencies",
                    );
                }

                const data: { cryptocurrencies: Cryptocurrency[] } =
                    await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(
                    error,
                    "Failed to get supported cryptocurrencies",
                );
            }
        },
    );

    server.registerTool(
        "add_supported_cryptocurrency",
        {
            description:
                "Add a new cryptocurrency to the supported manual-crypto list by submitting its CoinGecko coin-page URL. Only needed when get_supported_cryptocurrencies does not already list the symbol you want to track.",
            inputSchema: {
                coingecko_url: z
                    .string()
                    .min(1)
                    .max(200)
                    .describe(
                        "CoinGecko coin-page URL in the form https://www.coingecko.com/{locale}/coins/{id}, e.g. https://www.coingecko.com/en/coins/cardano.",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({ coingecko_url }) => {
            try {
                const response = await api.post("/cryptocurrencies", {
                    coingecko_url,
                });

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to add supported cryptocurrency",
                    );
                }

                const data: Cryptocurrency = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(
                    error,
                    "Failed to add supported cryptocurrency",
                );
            }
        },
    );

    server.registerTool(
        "get_all_manual_crypto",
        {
            description:
                "Get all manually-managed crypto balances associated with the user.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/crypto/manual");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get manual crypto balances",
                    );
                }

                const data: { crypto_manual: ManualCrypto[] } =
                    await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(
                    error,
                    "Failed to get manual crypto balances",
                );
            }
        },
    );

    server.registerTool(
        "get_single_manual_crypto",
        {
            description:
                "Get a single manually-managed crypto balance by ID. Call get_all_manual_crypto first to discover ids.",
            inputSchema: {
                crypto_id: id.describe(
                    "Id of the manual crypto balance to retrieve.",
                ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ crypto_id }) => {
            try {
                const response = await api.get(`/crypto/manual/${crypto_id}`);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get manual crypto balance",
                    );
                }

                const data: ManualCrypto = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(error, "Failed to get manual crypto balance");
            }
        },
    );

    server.registerTool(
        "create_manual_crypto",
        {
            description:
                "Create a manually-managed crypto asset. The symbol must match one returned by get_supported_cryptocurrencies.",
            inputSchema: {
                name: z
                    .string()
                    .min(1)
                    .max(45)
                    .describe(
                        "User-defined name for the manual crypto asset, e.g. 'Cold Wallet BTC'.",
                    ),
                balance: cryptoBalance.describe(
                    "Balance as a numeric string with up to 18 decimal places, e.g. '0.852341920145782301'. Pass a string to avoid losing precision.",
                ),
                symbol: z
                    .string()
                    .min(1)
                    .max(25)
                    .describe(
                        "Cryptocurrency symbol to track, e.g. 'btc'. Must match a symbol from get_supported_cryptocurrencies.",
                    ),
                display_name: z
                    .string()
                    .min(1)
                    .max(45)
                    .nullable()
                    .optional()
                    .describe(
                        "Optional display name. If omitted or null, clients may derive one from institution_name and name.",
                    ),
                institution_name: z
                    .string()
                    .min(1)
                    .max(50)
                    .nullable()
                    .optional()
                    .describe(
                        "Optional institution or wallet provider display name, e.g. 'Ledger'. If omitted or null, no institution name is set.",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({ name, balance, symbol, display_name, institution_name }) => {
            try {
                const body: Record<string, unknown> = {
                    name,
                    balance,
                    symbol,
                };

                if (display_name !== undefined)
                    body.display_name = display_name;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;

                const response = await api.post("/crypto/manual", body);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to create manual crypto balance",
                    );
                }

                const data: ManualCrypto = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(
                    error,
                    "Failed to create manual crypto balance",
                );
            }
        },
    );

    server.registerTool(
        "update_manual_crypto",
        {
            description:
                "Update a manually-managed crypto balance. Only the supplied fields change. The symbol of an existing balance cannot be changed.",
            inputSchema: {
                crypto_id: id.describe(
                    "Id of the manual crypto balance to update. Synced crypto balances cannot be updated.",
                ),
                balance: cryptoBalance
                    .optional()
                    .describe(
                        "New balance as a numeric string with up to 18 decimal places. Pass a string to avoid losing precision.",
                    ),
                name: z
                    .string()
                    .min(1)
                    .max(45)
                    .optional()
                    .describe("New name for the crypto asset."),
                display_name: z
                    .string()
                    .min(1)
                    .max(45)
                    .nullable()
                    .optional()
                    .describe(
                        "New display name for the crypto asset. Pass null to clear it.",
                    ),
                institution_name: z
                    .string()
                    .min(1)
                    .max(50)
                    .nullable()
                    .optional()
                    .describe(
                        "New institution or wallet provider display name. Pass null to clear it.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            crypto_id,
            balance,
            name,
            display_name,
            institution_name,
        }) => {
            try {
                const body: Record<string, unknown> = {};

                if (balance !== undefined) body.balance = balance;
                if (name !== undefined) body.name = name;
                if (display_name !== undefined)
                    body.display_name = display_name;
                if (institution_name !== undefined)
                    body.institution_name = institution_name;

                // The spec's update schema has no required fields, but the
                // live API rejects an empty body with a 400.
                if (Object.keys(body).length === 0) {
                    return errorResponse(
                        "Failed to update manual crypto balance: at least one property must be provided: name, display_name, institution_name, or balance.",
                    );
                }

                const response = await api.put(
                    `/crypto/manual/${crypto_id}`,
                    body,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update manual crypto balance",
                    );
                }

                const data: ManualCrypto = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(
                    error,
                    "Failed to update manual crypto balance",
                );
            }
        },
    );

    server.registerTool(
        "delete_manual_crypto",
        {
            description:
                "Delete a manually-managed crypto asset. If the asset has balance history, keep_history must be set explicitly or the API rejects the request. Irreversible.",
            inputSchema: {
                crypto_id: id.describe(
                    "Id of the manual crypto balance to delete.",
                ),
                keep_history: z
                    .boolean()
                    .optional()
                    .describe(
                        "Set true to preserve the balance history, false to delete it too. Required if the asset has balance history.",
                    ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ crypto_id, keep_history }) => {
            try {
                const params = new URLSearchParams();
                if (keep_history !== undefined)
                    params.append("keep_history", String(keep_history));

                const qs = params.toString();
                const response = await api.delete(
                    `/crypto/manual/${crypto_id}${qs ? `?${qs}` : ""}`,
                );

                if (response.status === 204) {
                    return successResponse("Manual crypto balance deleted.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete manual crypto balance",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to delete manual crypto balance",
                );
            }
        },
    );

    server.registerTool(
        "get_all_synced_crypto",
        {
            description:
                "Get all synced crypto accounts (Coinbase, Kraken, Ethereum wallets) and their nested per-symbol balances. Synced accounts are connected in the Lunch Money web app and cannot be created or edited through the API.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/crypto/synced");

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get synced crypto accounts",
                    );
                }

                const data: { crypto_synced: SyncedCryptoAccount[] } =
                    await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(
                    error,
                    "Failed to get synced crypto accounts",
                );
            }
        },
    );

    server.registerTool(
        "get_single_synced_crypto",
        {
            description:
                "Get a single synced crypto account and all its nested balances by ID.",
            inputSchema: {
                crypto_id: id.describe(
                    "Id of the synced crypto account to retrieve.",
                ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ crypto_id }) => {
            try {
                const response = await api.get(`/crypto/synced/${crypto_id}`);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get synced crypto account",
                    );
                }

                const data: SyncedCryptoAccount = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(error, "Failed to get synced crypto account");
            }
        },
    );

    server.registerTool(
        "get_synced_crypto_balance",
        {
            description:
                "Get a single balance held inside a synced crypto account, looked up by its cryptocurrency symbol.",
            inputSchema: {
                crypto_id: id.describe("Id of the synced crypto account."),
                symbol: z
                    .string()
                    .min(1)
                    .max(25)
                    .describe(
                        "Cryptocurrency symbol held within the synced account, e.g. 'eth'.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ crypto_id, symbol }) => {
            try {
                const response = await api.get(
                    `/crypto/synced/${crypto_id}/${encodeURIComponent(symbol)}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get synced crypto balance",
                    );
                }

                const data: SyncedCryptoBalance = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(error, "Failed to get synced crypto balance");
            }
        },
    );

    server.registerTool(
        "refresh_synced_crypto",
        {
            description:
                "Trigger a balance refresh for a synced crypto account and return the refreshed account. Reaches out to the external crypto provider.",
            inputSchema: {
                crypto_id: id.describe(
                    "Id of the synced crypto account to refresh.",
                ),
            },
            annotations: {
                openWorldHint: true,
            },
        },
        async ({ crypto_id }) => {
            try {
                const response = await api.post(
                    `/crypto/synced/${crypto_id}/refresh`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to refresh synced crypto account",
                    );
                }

                const data: SyncedCryptoAccount = await response.json();
                return dataResponse(data);
            } catch (error) {
                return catchError(
                    error,
                    "Failed to refresh synced crypto account",
                );
            }
        },
    );
}
