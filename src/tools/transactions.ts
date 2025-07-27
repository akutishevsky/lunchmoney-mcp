import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { Transaction } from "../types.js";

export function registerTransactionTools(server: McpServer) {
    server.tool(
        "get_transactions",
        "Retrieve transactions within a date range with optional filters",
        {
            input: z.object({
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
                        "Maximum number of transactions to return (max 500)"
                    ),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe("Pass true to return debit amounts as negative"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const params = new URLSearchParams({
                start_date: input.start_date,
                end_date: input.end_date,
            });

            if (input.tag_id !== undefined)
                params.append("tag_id", input.tag_id.toString());
            if (input.recurring_id !== undefined)
                params.append("recurring_id", input.recurring_id.toString());
            if (input.plaid_account_id !== undefined)
                params.append(
                    "plaid_account_id",
                    input.plaid_account_id.toString()
                );
            if (input.category_id !== undefined)
                params.append("category_id", input.category_id.toString());
            if (input.asset_id !== undefined)
                params.append("asset_id", input.asset_id.toString());
            if (input.is_group !== undefined)
                params.append("is_group", input.is_group.toString());
            if (input.status !== undefined)
                params.append("status", input.status);
            if (input.offset !== undefined)
                params.append("offset", input.offset.toString());
            if (input.limit !== undefined)
                params.append("limit", input.limit.toString());
            if (input.debit_as_negative !== undefined)
                params.append(
                    "debit_as_negative",
                    input.debit_as_negative.toString()
                );

            const response = await fetch(`${baseUrl}/transactions?${params}`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get transactions: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();
            const transactions: Transaction[] = data.transactions;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            transactions,
                            has_more: data.has_more,
                        }),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_single_transaction",
        "Get details of a specific transaction",
        {
            input: z.object({
                transaction_id: z
                    .number()
                    .describe("ID of the transaction to retrieve"),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe("Pass true to return debit amounts as negative"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const params = new URLSearchParams();
            if (input.debit_as_negative !== undefined) {
                params.append(
                    "debit_as_negative",
                    input.debit_as_negative.toString()
                );
            }

            const url = params.toString()
                ? `${baseUrl}/transactions/${input.transaction_id}?${params}`
                : `${baseUrl}/transactions/${input.transaction_id}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get transaction: ${response.statusText}`,
                        },
                    ],
                };
            }

            const transaction: Transaction = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(transaction),
                    },
                ],
            };
        }
    );

    server.tool(
        "create_transactions",
        "Insert one or more transactions",
        {
            input: z.object({
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
                                    "Amount as string with up to 4 decimal places"
                                ),
                            currency: z
                                .string()
                                .optional()
                                .describe(
                                    "Three-letter lowercase currency code"
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
                        })
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
                        "Skip transactions that are potential duplicates"
                    ),
                check_for_recurring: z
                    .boolean()
                    .optional()
                    .describe(
                        "Check if transactions are part of recurring expenses"
                    ),
                debit_as_negative: z
                    .boolean()
                    .optional()
                    .describe(
                        "Pass true if debits are provided as negative amounts"
                    ),
                skip_balance_update: z
                    .boolean()
                    .optional()
                    .describe("Skip updating balance for assets/accounts"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const body: any = {
                transactions: input.transactions,
            };

            if (input.apply_rules !== undefined)
                body.apply_rules = input.apply_rules;
            if (input.skip_duplicates !== undefined)
                body.skip_duplicates = input.skip_duplicates;
            if (input.check_for_recurring !== undefined)
                body.check_for_recurring = input.check_for_recurring;
            if (input.debit_as_negative !== undefined)
                body.debit_as_negative = input.debit_as_negative;
            if (input.skip_balance_update !== undefined)
                body.skip_balance_update = input.skip_balance_update;

            const response = await fetch(`${baseUrl}/transactions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to create transactions: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "update_transaction",
        "Update an existing transaction",
        {
            input: z.object({
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
                                "Amount as string with up to 4 decimal places"
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
                        "Pass true if debits are provided as negative amounts"
                    ),
                skip_balance_update: z
                    .boolean()
                    .optional()
                    .describe("Skip updating balance for assets/accounts"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const body: any = {
                transaction: input.transaction,
            };

            if (input.debit_as_negative !== undefined)
                body.debit_as_negative = input.debit_as_negative;
            if (input.skip_balance_update !== undefined)
                body.skip_balance_update = input.skip_balance_update;

            const response = await fetch(
                `${baseUrl}/transactions/${input.transaction_id}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                }
            );

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to update transaction: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "unsplit_transactions",
        "Remove one or more transactions from a split",
        {
            input: z.object({
                parent_ids: z
                    .array(z.number())
                    .describe("Array of parent transaction IDs to unsplit"),
                remove_parents: z
                    .boolean()
                    .optional()
                    .describe("If true, delete parent transactions"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/transactions/unsplit`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    parent_ids: input.parent_ids,
                    remove_parents: input.remove_parents,
                }),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to unsplit transactions: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_transaction_group",
        "Get details of a transaction group",
        {
            input: z.object({
                transaction_id: z
                    .number()
                    .describe("ID of the transaction group"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/transactions/group/${input.transaction_id}`,
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
                            text: `Failed to get transaction group: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "create_transaction_group",
        "Create a transaction group",
        {
            input: z.object({
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
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/transactions/group`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to create transaction group: ${response.statusText}`,
                        },
                    ],
                };
            }

            const result = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "delete_transaction_group",
        "Delete a transaction group or a single transaction.",
        {
            input: z.object({
                transaction_id: z
                    .number()
                    .describe("ID of the transaction group to delete"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/transactions/group/${input.transaction_id}`,
                {
                    method: "DELETE",
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
                            text: `Failed to delete transaction group: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: "Transaction group deleted successfully",
                    },
                ],
            };
        }
    );
}
