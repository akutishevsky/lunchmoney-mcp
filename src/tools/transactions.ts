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
                manual_account_id: z.number().optional().describe("Filter by manual account ID"),
                is_group: z
                    .boolean()
                    .optional()
                    .describe("Filter by transaction groups"),
                status: z
                    .string()
                    .optional()
                    .describe("Filter by status: reviewed, unreviewed, pending"),
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
                include_pending: z
                    .boolean()
                    .optional()
                    .describe("Include pending transactions"),
                include_metadata: z
                    .boolean()
                    .optional()
                    .describe("Include transaction metadata"),
                include_files: z
                    .boolean()
                    .optional()
                    .describe("Include attached files"),
                include_children: z
                    .boolean()
                    .optional()
                    .describe("Include child transactions (for splits/groups)"),
                include_split_parents: z
                    .boolean()
                    .optional()
                    .describe("Include split parent transactions"),
                created_since: z
                    .string()
                    .optional()
                    .describe("Filter transactions created since this date (ISO date format)"),
                updated_since: z
                    .string()
                    .optional()
                    .describe("Filter transactions updated since this datetime (ISO datetime format)"),
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
            if (input.manual_account_id !== undefined)
                params.append("manual_account_id", input.manual_account_id.toString());
            if (input.is_group !== undefined)
                params.append("is_group", input.is_group.toString());
            if (input.status !== undefined)
                params.append("status", input.status);
            if (input.offset !== undefined)
                params.append("offset", input.offset.toString());
            if (input.limit !== undefined)
                params.append("limit", input.limit.toString());
            if (input.include_pending !== undefined)
                params.append("include_pending", input.include_pending.toString());
            if (input.include_metadata !== undefined)
                params.append("include_metadata", input.include_metadata.toString());
            if (input.include_files !== undefined)
                params.append("include_files", input.include_files.toString());
            if (input.include_children !== undefined)
                params.append("include_children", input.include_children.toString());
            if (input.include_split_parents !== undefined)
                params.append("include_split_parents", input.include_split_parents.toString());
            if (input.created_since !== undefined)
                params.append("created_since", input.created_since);
            if (input.updated_since !== undefined)
                params.append("updated_since", input.updated_since);

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
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const url = `${baseUrl}/transactions/${input.transaction_id}`;

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
                            manual_account_id: z
                                .number()
                                .optional()
                                .describe("Manual account ID"),
                            recurring_id: z
                                .number()
                                .optional()
                                .describe("Recurring expense ID"),
                            notes: z
                                .string()
                                .optional()
                                .describe("Transaction notes"),
                            status: z
                                .enum(["reviewed", "unreviewed", "pending"])
                                .optional()
                                .describe("Transaction status"),
                            external_id: z
                                .string()
                                .optional()
                                .describe("External ID (max 75 characters)"),
                            tag_ids: z
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
                manual_account_id: z
                    .number()
                    .optional()
                    .describe("Manual account ID"),
                recurring_id: z
                    .number()
                    .optional()
                    .describe("Recurring expense ID"),
                notes: z
                    .string()
                    .optional()
                    .describe("Transaction notes"),
                status: z
                    .enum(["reviewed", "unreviewed", "pending"])
                    .optional()
                    .describe("Transaction status"),
                external_id: z
                    .string()
                    .optional()
                    .describe("External ID (max 75 characters)"),
                tag_ids: z
                    .array(z.number())
                    .optional()
                    .describe("Array of tag IDs"),
                skip_balance_update: z
                    .boolean()
                    .optional()
                    .describe("Skip updating balance for assets/accounts"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const body: any = {};

            if (input.date !== undefined) body.date = input.date;
            if (input.payee !== undefined) body.payee = input.payee;
            if (input.amount !== undefined) body.amount = input.amount;
            if (input.currency !== undefined) body.currency = input.currency;
            if (input.category_id !== undefined) body.category_id = input.category_id;
            if (input.manual_account_id !== undefined) body.manual_account_id = input.manual_account_id;
            if (input.recurring_id !== undefined) body.recurring_id = input.recurring_id;
            if (input.notes !== undefined) body.notes = input.notes;
            if (input.status !== undefined) body.status = input.status;
            if (input.external_id !== undefined) body.external_id = input.external_id;
            if (input.tag_ids !== undefined) body.tag_ids = input.tag_ids;
            if (input.skip_balance_update !== undefined) body.skip_balance_update = input.skip_balance_update;

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
        "delete_transaction",
        "Delete a single transaction",
        {
            input: z.object({
                transaction_id: z
                    .number()
                    .describe("ID of the transaction to delete"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/transactions/${input.transaction_id}`,
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
                            text: `Failed to delete transaction: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: "Transaction deleted successfully",
                    },
                ],
            };
        }
    );

    server.tool(
        "unsplit_transaction",
        "Remove a transaction from a split (unsplit operation)",
        {
            input: z.object({
                transaction_id: z
                    .number()
                    .describe("ID of the split parent transaction to unsplit"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/transactions/split/${input.transaction_id}`,
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
                        text: "Transaction unsplit successfully",
                    },
                ],
            };
        }
    );

    server.tool(
        "ungroup_transaction",
        "Remove a transaction group (ungroup operation)",
        {
            input: z.object({
                transaction_id: z
                    .number()
                    .describe("ID of the transaction group to ungroup"),
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
                            text: `Failed to ungroup transaction: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: "Transaction ungrouped successfully",
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
                ids: z
                    .array(z.number())
                    .describe("Array of transaction IDs to group"),
                date: z.string().describe("Date in YYYY-MM-DD format"),
                payee: z.string().describe("Payee name for the group"),
                category_id: z
                    .number()
                    .optional()
                    .describe("Category ID for the group"),
                notes: z.string().optional().describe("Notes for the group"),
                status: z
                    .enum(["reviewed", "unreviewed"])
                    .optional()
                    .describe("Transaction status"),
                tag_ids: z
                    .array(z.number())
                    .optional()
                    .describe("Array of tag IDs for the group"),
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
        "split_transaction",
        "Split a transaction into multiple parts",
        {
            input: z.object({
                transaction_id: z
                    .number()
                    .describe("ID of the transaction to split"),
                splits: z
                    .array(
                        z.object({
                            payee: z.string().optional().describe("Payee name for this split"),
                            amount: z.string().describe("Amount for this split"),
                            category_id: z.number().optional().describe("Category ID for this split"),
                            notes: z.string().optional().describe("Notes for this split"),
                        })
                    )
                    .describe("Array of split transactions"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/transactions/split/${input.transaction_id}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ splits: input.splits }),
                }
            );

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to split transaction: ${response.statusText}`,
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
        "bulk_delete_transactions",
        "Delete multiple transactions at once",
        {
            input: z.object({
                ids: z
                    .array(z.number())
                    .describe("Array of transaction IDs to delete"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/transactions`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ids: input.ids }),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to delete transactions: ${response.statusText}`,
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
        "bulk_update_transactions",
        "Update multiple transactions at once",
        {
            input: z.object({
                transactions: z
                    .array(
                        z.object({
                            id: z.number().describe("Transaction ID to update"),
                            date: z.string().optional().describe("Date in YYYY-MM-DD format"),
                            payee: z.string().optional().describe("Payee name"),
                            amount: z.string().optional().describe("Amount as string"),
                            currency: z.string().optional().describe("Three-letter currency code"),
                            category_id: z.number().optional().describe("Category ID"),
                            notes: z.string().optional().describe("Transaction notes"),
                            status: z
                                .enum(["reviewed", "unreviewed", "pending"])
                                .optional()
                                .describe("Transaction status"),
                            tag_ids: z.array(z.number()).optional().describe("Array of tag IDs"),
                        })
                    )
                    .describe("Array of transactions to update"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/transactions`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(input.transactions),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to update transactions: ${response.statusText}`,
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

}
