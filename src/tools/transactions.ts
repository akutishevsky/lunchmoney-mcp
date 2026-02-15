import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { formatData } from "../format.js";
import { Transaction } from "../types.js";

export function registerTransactionTools(server: McpServer) {
    server.registerTool(
        "get_transactions",
        {
            description:
                "Retrieve transactions within a date range with optional filters",
            inputSchema: {
                start_date: z
                    .string()
                    .describe("Start date in YYYY-MM-DD format"),
                end_date: z.string().describe("End date in YYYY-MM-DD format"),
                tag_id: z.number().optional().describe("Filter by tag ID"),
                recurring_id: z
                    .number()
                    .optional()
                    .describe("Filter by recurring expense ID"),
                plaid_account_id: z
                    .number()
                    .optional()
                    .describe("Filter by Plaid account ID"),
                category_id: z
                    .number()
                    .optional()
                    .describe("Filter by category ID"),
                asset_id: z.number().optional().describe("Filter by asset ID"),
                is_group: z
                    .boolean()
                    .optional()
                    .describe("Filter by transaction groups"),
                status: z
                    .string()
                    .optional()
                    .describe("Filter by status: cleared, uncleared, pending"),
                offset: z
                    .number()
                    .optional()
                    .describe("Number of transactions to skip"),
                limit: z
                    .number()
                    .optional()
                    .describe(
                        "Maximum number of transactions to return (max 500)",
                    ),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe("Pass true to return debit amounts as negative"),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({
            start_date,
            end_date,
            tag_id,
            recurring_id,
            plaid_account_id,
            category_id,
            asset_id,
            is_group,
            status,
            offset,
            limit,
            debit_as_negative,
        }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const params = new URLSearchParams({
                    start_date,
                    end_date,
                });

                if (tag_id !== undefined)
                    params.append("tag_id", tag_id.toString());
                if (recurring_id !== undefined)
                    params.append("recurring_id", recurring_id.toString());
                if (plaid_account_id !== undefined)
                    params.append(
                        "plaid_account_id",
                        plaid_account_id.toString(),
                    );
                if (category_id !== undefined)
                    params.append("category_id", category_id.toString());
                if (asset_id !== undefined)
                    params.append("asset_id", asset_id.toString());
                if (is_group !== undefined)
                    params.append("is_group", is_group.toString());
                if (status !== undefined) params.append("status", status);
                if (offset !== undefined)
                    params.append("offset", offset.toString());
                if (limit !== undefined)
                    params.append("limit", limit.toString());
                if (debit_as_negative !== undefined)
                    params.append(
                        "debit_as_negative",
                        debit_as_negative.toString(),
                    );

                const response = await fetch(
                    `${baseUrl}/transactions?${params}`,
                    {
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                        },
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to get transactions",
                        ),
                    );
                }

                const data = await response.json();
                const transactions: Transaction[] = data.transactions;

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData({
                                transactions,
                                has_more: data.has_more,
                            }),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to get transactions");
            }
        },
    );

    server.registerTool(
        "get_single_transaction",
        {
            description: "Get details of a specific transaction",
            inputSchema: {
                transaction_id: z
                    .number()
                    .describe("ID of the transaction to retrieve"),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe("Pass true to return debit amounts as negative"),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ transaction_id, debit_as_negative }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const params = new URLSearchParams();
                if (debit_as_negative !== undefined) {
                    params.append(
                        "debit_as_negative",
                        debit_as_negative.toString(),
                    );
                }

                const url = params.toString()
                    ? `${baseUrl}/transactions/${transaction_id}?${params}`
                    : `${baseUrl}/transactions/${transaction_id}`;

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                    },
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to get transaction",
                        ),
                    );
                }

                const transaction: Transaction = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(transaction),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to get transaction");
            }
        },
    );

    server.registerTool(
        "create_transactions",
        {
            description: "Insert one or more transactions",
            inputSchema: {
                transactions: z
                    .array(
                        z.object({
                            date: z
                                .string()
                                .describe("Date in YYYY-MM-DD format"),
                            payee: z.string().describe("Payee name"),
                            amount: z
                                .string()
                                .describe(
                                    "Amount as string with up to 4 decimal places",
                                ),
                            currency: z
                                .string()
                                .optional()
                                .describe(
                                    "Three-letter lowercase currency code",
                                ),
                            category_id: z
                                .number()
                                .optional()
                                .describe("Category ID"),
                            asset_id: z
                                .number()
                                .optional()
                                .describe("Asset ID for manual accounts"),
                            recurring_id: z
                                .number()
                                .optional()
                                .describe("Recurring expense ID"),
                            notes: z
                                .string()
                                .optional()
                                .describe("Transaction notes"),
                            status: z
                                .enum(["cleared", "uncleared", "pending"])
                                .optional()
                                .describe("Transaction status"),
                            external_id: z
                                .string()
                                .optional()
                                .describe("External ID (max 75 characters)"),
                            tags: z
                                .array(z.number())
                                .optional()
                                .describe("Array of tag IDs"),
                        }),
                    )
                    .describe("Array of transactions to create"),
                apply_rules: z
                    .boolean()
                    .optional()
                    .describe("Apply account's rules to transactions"),
                skip_duplicates: z
                    .boolean()
                    .optional()
                    .describe(
                        "Skip transactions that are potential duplicates",
                    ),
                check_for_recurring: z
                    .boolean()
                    .optional()
                    .describe(
                        "Check if transactions are part of recurring expenses",
                    ),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe(
                        "Pass true if debits are provided as negative amounts",
                    ),
                skip_balance_update: z
                    .boolean()
                    .optional()
                    .describe("Skip updating balance for assets/accounts"),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({
            transactions,
            apply_rules,
            skip_duplicates,
            check_for_recurring,
            debit_as_negative,
            skip_balance_update,
        }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const body: any = {
                    transactions,
                };

                if (apply_rules !== undefined) body.apply_rules = apply_rules;
                if (skip_duplicates !== undefined)
                    body.skip_duplicates = skip_duplicates;
                if (check_for_recurring !== undefined)
                    body.check_for_recurring = check_for_recurring;
                if (debit_as_negative !== undefined)
                    body.debit_as_negative = debit_as_negative;
                if (skip_balance_update !== undefined)
                    body.skip_balance_update = skip_balance_update;

                const response = await fetch(`${baseUrl}/transactions`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to create transactions",
                        ),
                    );
                }

                const result = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(result),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to create transactions");
            }
        },
    );

    server.registerTool(
        "update_transaction",
        {
            description: "Update an existing transaction",
            inputSchema: {
                transaction_id: z
                    .number()
                    .describe("ID of the transaction to update"),
                transaction: z
                    .object({
                        date: z
                            .string()
                            .optional()
                            .describe("Date in YYYY-MM-DD format"),
                        payee: z.string().optional().describe("Payee name"),
                        amount: z
                            .string()
                            .optional()
                            .describe(
                                "Amount as string with up to 4 decimal places",
                            ),
                        currency: z
                            .string()
                            .optional()
                            .describe("Three-letter lowercase currency code"),
                        category_id: z
                            .number()
                            .optional()
                            .describe("Category ID"),
                        asset_id: z
                            .number()
                            .optional()
                            .describe("Asset ID for manual accounts"),
                        recurring_id: z
                            .number()
                            .optional()
                            .describe("Recurring expense ID"),
                        notes: z
                            .string()
                            .optional()
                            .describe("Transaction notes"),
                        status: z
                            .enum(["cleared", "uncleared", "pending"])
                            .optional()
                            .describe("Transaction status"),
                        external_id: z
                            .string()
                            .optional()
                            .describe("External ID (max 75 characters)"),
                        tags: z
                            .array(z.number())
                            .optional()
                            .describe("Array of tag IDs"),
                    })
                    .describe("Transaction data to update"),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe(
                        "Pass true if debits are provided as negative amounts",
                    ),
                skip_balance_update: z
                    .boolean()
                    .optional()
                    .describe("Skip updating balance for assets/accounts"),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            transaction_id,
            transaction,
            debit_as_negative,
            skip_balance_update,
        }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const body: any = {
                    transaction,
                };

                if (debit_as_negative !== undefined)
                    body.debit_as_negative = debit_as_negative;
                if (skip_balance_update !== undefined)
                    body.skip_balance_update = skip_balance_update;

                const response = await fetch(
                    `${baseUrl}/transactions/${transaction_id}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body),
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to update transaction",
                        ),
                    );
                }

                const result = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(result),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to update transaction");
            }
        },
    );

    server.registerTool(
        "unsplit_transactions",
        {
            description: "Remove one or more transactions from a split",
            inputSchema: {
                parent_ids: z
                    .array(z.number())
                    .describe("Array of parent transaction IDs to unsplit"),
                remove_parents: z
                    .boolean()
                    .optional()
                    .describe("If true, delete parent transactions"),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ parent_ids, remove_parents }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(
                    `${baseUrl}/transactions/unsplit`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            parent_ids,
                            remove_parents,
                        }),
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to unsplit transactions",
                        ),
                    );
                }

                const result = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(result),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to unsplit transactions");
            }
        },
    );

    server.registerTool(
        "get_transaction_group",
        {
            description: "Get details of a transaction group",
            inputSchema: {
                transaction_id: z
                    .number()
                    .describe("ID of the transaction group"),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ transaction_id }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(
                    `${baseUrl}/transactions/group/${transaction_id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                        },
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to get transaction group",
                        ),
                    );
                }

                const result = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(result),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to get transaction group");
            }
        },
    );

    server.registerTool(
        "create_transaction_group",
        {
            description: "Create a transaction group",
            inputSchema: {
                date: z.string().describe("Date in YYYY-MM-DD format"),
                payee: z.string().describe("Payee name for the group"),
                category_id: z
                    .number()
                    .optional()
                    .describe("Category ID for the group"),
                notes: z.string().optional().describe("Notes for the group"),
                tags: z
                    .array(z.number())
                    .optional()
                    .describe("Array of tag IDs for the group"),
                transaction_ids: z
                    .array(z.number())
                    .describe("Array of transaction IDs to group"),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({ date, payee, category_id, notes, tags, transaction_ids }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(`${baseUrl}/transactions/group`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        date,
                        payee,
                        category_id,
                        notes,
                        tags,
                        transaction_ids,
                    }),
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to create transaction group",
                        ),
                    );
                }

                const result = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(result),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to create transaction group");
            }
        },
    );

    server.registerTool(
        "delete_transaction_group",
        {
            description: "Delete a transaction group or a single transaction.",
            inputSchema: {
                transaction_id: z
                    .number()
                    .describe("ID of the transaction group to delete"),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ transaction_id }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(
                    `${baseUrl}/transactions/group/${transaction_id}`,
                    {
                        method: "DELETE",
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                        },
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to delete transaction group",
                        ),
                    );
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: "Transaction group deleted successfully",
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to delete transaction group");
            }
        },
    );
}
