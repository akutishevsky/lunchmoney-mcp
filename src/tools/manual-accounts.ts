import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { ManualAccount } from "../types.js";

export function registerManualAccountTools(server: McpServer) {
    server.tool(
        "get_all_manual_accounts",
        "Get a list of all manually-managed accounts associated with the user",
        {},
        async () => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/manual_accounts`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get manual accounts: ${response.statusText}`,
                        },
                    ],
                };
            }

            const data = await response.json();
            const manualAccounts: ManualAccount[] = data.manual_accounts;

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(manualAccounts),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_manual_account",
        "Get a single manually-managed account by ID",
        {
            input: z.object({
                account_id: z
                    .number()
                    .describe("ID of the manual account to retrieve"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/manual_accounts/${input.account_id}`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get manual account: ${response.statusText}`,
                        },
                    ],
                };
            }

            const account: ManualAccount = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(account),
                    },
                ],
            };
        }
    );

    server.tool(
        "create_manual_account",
        "Create a new manually-managed account",
        {
            input: z.object({
                type: z
                    .enum([
                        "cash",
                        "credit",
                        "investment",
                        "real estate",
                        "loan",
                        "vehicle",
                        "cryptocurrency",
                        "employee compensation",
                        "other liability",
                        "other asset",
                    ])
                    .describe("Primary type of the account"),
                subtype: z
                    .string()
                    .optional()
                    .describe("Optional subtype (e.g., retirement, checking, savings)"),
                name: z
                    .string()
                    .describe("Name of the account"),
                display_name: z
                    .string()
                    .optional()
                    .describe("Display name of the account (defaults to name)"),
                balance: z
                    .number()
                    .describe("Current balance of the account"),
                balance_as_of: z
                    .string()
                    .optional()
                    .describe("Date/time the balance is as of in ISO 8601 format"),
                currency: z
                    .string()
                    .optional()
                    .describe("Three-letter currency code (defaults to primary currency)"),
                institution_name: z
                    .string()
                    .optional()
                    .describe("Name of the institution holding the account"),
                closed_on: z
                    .string()
                    .optional()
                    .describe("Date the account was closed in YYYY-MM-DD format"),
                exclude_from_transactions: z
                    .boolean()
                    .optional()
                    .describe("Whether to exclude this account from transaction options"),
                external_id: z
                    .string()
                    .optional()
                    .describe("External ID for the account"),
                custom_metadata: z
                    .any()
                    .optional()
                    .describe("Custom metadata for the account"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const body: any = {
                type: input.type,
                name: input.name,
                balance: input.balance.toString(),
            };

            if (input.subtype) body.subtype = input.subtype;
            if (input.display_name) body.display_name = input.display_name;
            if (input.balance_as_of) body.balance_as_of = input.balance_as_of;
            if (input.currency) body.currency = input.currency;
            if (input.institution_name) body.institution_name = input.institution_name;
            if (input.closed_on) body.closed_on = input.closed_on;
            if (input.exclude_from_transactions !== undefined) body.exclude_from_transactions = input.exclude_from_transactions;
            if (input.external_id) body.external_id = input.external_id;
            if (input.custom_metadata) body.custom_metadata = input.custom_metadata;

            const response = await fetch(`${baseUrl}/manual_accounts`, {
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
                            text: `Failed to create manual account: ${response.statusText}`,
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
        "update_manual_account",
        "Update an existing manually-managed account",
        {
            input: z.object({
                account_id: z
                    .number()
                    .describe("ID of the account to update"),
                type: z
                    .enum([
                        "cash",
                        "credit",
                        "investment",
                        "real estate",
                        "loan",
                        "vehicle",
                        "cryptocurrency",
                        "employee compensation",
                        "other liability",
                        "other asset",
                    ])
                    .optional()
                    .describe("Primary type of the account"),
                subtype: z
                    .string()
                    .optional()
                    .describe("Optional subtype (e.g., retirement, checking, savings)"),
                name: z
                    .string()
                    .optional()
                    .describe("Name of the account"),
                display_name: z
                    .string()
                    .optional()
                    .describe("Display name of the account"),
                balance: z
                    .number()
                    .optional()
                    .describe("Current balance of the account"),
                balance_as_of: z
                    .string()
                    .optional()
                    .describe("Date/time the balance is as of in ISO 8601 format"),
                currency: z
                    .string()
                    .optional()
                    .describe("Three-letter currency code"),
                institution_name: z
                    .string()
                    .optional()
                    .describe("Name of the institution holding the account"),
                closed_on: z
                    .string()
                    .optional()
                    .describe("Date the account was closed in YYYY-MM-DD format"),
                exclude_from_transactions: z
                    .boolean()
                    .optional()
                    .describe("Whether to exclude this account from transaction options"),
                external_id: z
                    .string()
                    .optional()
                    .describe("External ID for the account"),
                custom_metadata: z
                    .any()
                    .optional()
                    .describe("Custom metadata for the account"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const body: any = {};

            if (input.type) body.type = input.type;
            if (input.subtype) body.subtype = input.subtype;
            if (input.name) body.name = input.name;
            if (input.display_name) body.display_name = input.display_name;
            if (input.balance !== undefined) body.balance = input.balance.toString();
            if (input.balance_as_of) body.balance_as_of = input.balance_as_of;
            if (input.currency) body.currency = input.currency;
            if (input.institution_name) body.institution_name = input.institution_name;
            if (input.closed_on) body.closed_on = input.closed_on;
            if (input.exclude_from_transactions !== undefined) body.exclude_from_transactions = input.exclude_from_transactions;
            if (input.external_id) body.external_id = input.external_id;
            if (input.custom_metadata) body.custom_metadata = input.custom_metadata;

            const response = await fetch(`${baseUrl}/manual_accounts/${input.account_id}`, {
                method: "PUT",
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
                            text: `Failed to update manual account: ${response.statusText}`,
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
        "delete_manual_account",
        "Delete a manually-managed account",
        {
            input: z.object({
                account_id: z
                    .number()
                    .describe("ID of the account to delete"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/manual_accounts/${input.account_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to delete manual account: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: "Manual account deleted successfully",
                    },
                ],
            };
        }
    );
}
