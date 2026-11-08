import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    successResponse,
    handleApiError,
    catchError,
    errorResponse,
} from "../api.js";
import {
    ALLOWED_ATTACHMENT_MIME_TYPES,
    contentTypeMatches,
    readAttachment,
} from "../attachments.js";
import { amount, currency, id, isoDate } from "../schemas.js";

// Transaction IDs are int64 in the spec, so they are not capped at int32 the
// way the shared `id` validator is.
const transactionId = z.coerce.number().int().positive();

// Filter IDs where 0 is a meaningful value (no account, or uncategorized).
const filterId = z.coerce.number().int().min(0).max(2147483647);

const dateOrDateTime = z.union([
    isoDate,
    z.string().datetime({ offset: true }),
]);
const statusEnum = z.enum(["reviewed", "unreviewed", "delete_pending"]);
const writeStatusEnum = z.enum(["reviewed", "unreviewed"]);

// Spec: custom_metadata on POST /transactions must not exceed 4096 characters
// when stringified. The PUT endpoints carry no such limit.
const fitsCustomMetadata = (value: Record<string, unknown>) =>
    JSON.stringify(value).length <= 4096;

// Spec: manual_account_id and plaid_account_id may not both be non-null.
function checkAccountPair(
    value: {
        manual_account_id?: number | null;
        plaid_account_id?: number | null;
    },
    ctx: z.RefinementCtx,
) {
    if (value.manual_account_id != null && value.plaid_account_id != null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["plaid_account_id"],
            message:
                "manual_account_id and plaid_account_id cannot both be non-null on the same transaction. Set only one of them.",
        });
    }
}

type UpdateFieldsInput = {
    id?: number;
    manual_account_id?: number | null;
    plaid_account_id?: number | null;
    tag_ids?: number[];
    additional_tag_ids?: number[];
};

// Spec: tag_ids and additional_tag_ids are mutually exclusive, and an update
// must carry at least one writable field besides the id.
function checkUpdateFields(value: UpdateFieldsInput, ctx: z.RefinementCtx) {
    checkAccountPair(value, ctx);

    if (value.tag_ids !== undefined && value.additional_tag_ids !== undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["additional_tag_ids"],
            message:
                "tag_ids and additional_tag_ids cannot both be set. Use tag_ids to replace tags, or additional_tag_ids to add to them.",
        });
    }

    const hasWritableField = Object.entries(value).some(
        ([key, v]) => key !== "id" && v !== undefined,
    );
    if (!hasWritableField) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
                "Provide at least one writable field to update (for example category_id, notes, or tag_ids).",
        });
    }
}

const splitChildSchema = z.object({
    amount: amount.describe(
        "Amount of this split, as a number or a string with up to 4 decimal places. Sum of all children must equal the parent's amount.",
    ),
    payee: z.string().optional().describe("Defaults to the parent's payee."),
    date: isoDate.optional().describe("Defaults to the parent's date."),
    category_id: id
        .nullable()
        .optional()
        .describe(
            "Category ID. Omit to inherit the parent's category; null leaves the child uncategorized. Cannot be a category group.",
        ),
    tag_ids: z
        .array(id)
        .optional()
        .describe(
            "Tag IDs to apply to this child. Each must match an existing tag.",
        ),
    notes: z
        .string()
        .nullable()
        .optional()
        .describe(
            "Defaults to the parent's notes. null or an empty string leaves the child with no notes.",
        ),
});

const insertTransactionSchema = z
    .object({
        date: isoDate.describe("Transaction date (YYYY-MM-DD)."),
        amount: amount.describe(
            "Numeric value (no currency symbol). Positive = debit, negative = credit. A number, or a string with up to 4 decimal places.",
        ),
        currency: currency
            .optional()
            .describe(
                "Three-letter currency code, e.g. usd (case-insensitive). Defaults to the account's primary currency.",
            ),
        payee: z.string().optional().describe("Payee name."),
        original_name: z
            .string()
            .nullable()
            .optional()
            .describe("Original payee name. Defaults to payee."),
        category_id: id
            .nullable()
            .optional()
            .describe(
                "Category ID. Cannot be a category group. null or omitted means no category.",
            ),
        notes: z.string().nullable().optional().describe("Transaction notes."),
        manual_account_id: id
            .nullable()
            .optional()
            .describe(
                "Manual account ID. Mutually exclusive with plaid_account_id.",
            ),
        plaid_account_id: id
            .nullable()
            .optional()
            .describe(
                "Plaid account ID. Mutually exclusive with manual_account_id.",
            ),
        recurring_id: id
            .nullable()
            .optional()
            .describe(
                "Recurring item ID. The recurring item must belong to the same account.",
            ),
        status: writeStatusEnum.optional().describe("Defaults to unreviewed."),
        tag_ids: z
            .array(id)
            .optional()
            .describe("Tag IDs to apply. If omitted, no tags are applied."),
        external_id: z
            .string()
            .max(75)
            .nullable()
            .optional()
            .describe(
                "User-defined external ID. With manual_account_id set, duplicate external IDs for that account are rejected.",
            ),
        custom_metadata: z
            .record(z.unknown())
            .refine(
                fitsCustomMetadata,
                "custom_metadata must not exceed 4096 characters when stringified.",
            )
            .nullable()
            .optional()
            .describe(
                "Arbitrary JSON object stored with the transaction (max 4096 characters when stringified).",
            ),
    })
    .superRefine(checkAccountPair);

const updateTransactionBase = z.object({
    date: isoDate.optional().describe("New transaction date (YYYY-MM-DD)."),
    amount: amount
        .optional()
        .describe(
            "New amount, as a number or a string with up to 4 decimal places. Cannot be null.",
        ),
    currency: currency
        .optional()
        .describe("New three-letter currency code, e.g. usd."),
    recurring_id: id
        .nullable()
        .optional()
        .describe("Recurring item ID. null unlinks the recurring item."),
    payee: z.string().optional().describe("New payee name."),
    category_id: id
        .nullable()
        .optional()
        .describe("Category ID. null clears the category."),
    notes: z
        .string()
        .nullable()
        .optional()
        .describe("New notes. An empty string clears the existing notes."),
    manual_account_id: id
        .nullable()
        .optional()
        .describe(
            "Manual account ID. null disassociates the transaction from its account. Mutually exclusive with plaid_account_id.",
        ),
    plaid_account_id: id
        .nullable()
        .optional()
        .describe(
            "Plaid account ID. Mutually exclusive with manual_account_id.",
        ),
    status: writeStatusEnum.optional().describe("New status."),
    tag_ids: z
        .array(id)
        .optional()
        .describe(
            "Replaces all existing tags on the transaction. An empty array removes all tags. Mutually exclusive with additional_tag_ids.",
        ),
    additional_tag_ids: z
        .array(id)
        .optional()
        .describe(
            "Adds these tags to the existing transaction tags. Mutually exclusive with tag_ids.",
        ),
    external_id: z
        .string()
        .max(75)
        .nullable()
        .optional()
        .describe(
            "User-defined external ID. The update fails if the transaction has no manual_account_id or another transaction already uses this external ID for that account.",
        ),
    custom_metadata: z
        .record(z.unknown())
        .nullable()
        .optional()
        .describe("Arbitrary JSON object stored with the transaction."),
});

const updateTransactionFieldsSchema =
    updateTransactionBase.superRefine(checkUpdateFields);

const bulkUpdateEntrySchema = updateTransactionBase
    .extend({
        id: transactionId.describe(
            "ID of the transaction to update (required).",
        ),
    })
    .superRefine(checkUpdateFields);

export function registerTransactionTools(server: McpServer) {
    server.registerTool(
        "get_transactions",
        {
            description:
                "Retrieve transactions, optionally filtered by date range, account, category, tag, recurring item, status, and more. Returns at most `limit` transactions (default 1000, max 2000); `has_more` is set on the response when more match the filters. Pending and split-parent / group-child transactions are excluded by default.",
            inputSchema: {
                start_date: isoDate
                    .optional()
                    .describe(
                        "Beginning of the date range (YYYY-MM-DD). Must be sent together with end_date.",
                    ),
                end_date: isoDate
                    .optional()
                    .describe(
                        "End of the date range (YYYY-MM-DD). Must be sent together with start_date.",
                    ),
                created_since: dateOrDateTime
                    .optional()
                    .describe(
                        "Only return transactions created after this timestamp, given as a date (YYYY-MM-DD) or ISO 8601 datetime. Date-only values are read as midnight UTC.",
                    ),
                updated_since: dateOrDateTime
                    .optional()
                    .describe(
                        "Only return transactions updated after this timestamp, given as a date (YYYY-MM-DD) or ISO 8601 datetime. Date-only values are read as midnight UTC.",
                    ),
                manual_account_id: filterId
                    .optional()
                    .describe(
                        "Filter by manual account ID, or 0 to omit all manual-account transactions. 0 together with plaid_account_id 0 returns transactions with no account.",
                    ),
                plaid_account_id: filterId
                    .optional()
                    .describe(
                        "Filter by Plaid account ID, or 0 to omit all Plaid-account transactions. 0 together with manual_account_id 0 returns transactions with no account.",
                    ),
                recurring_id: id
                    .optional()
                    .describe("Filter by recurring item ID."),
                category_id: filterId
                    .optional()
                    .describe(
                        "Filter by category ID. 0 returns only un-categorized transactions. Matches both leaf categories and category groups.",
                    ),
                tag_id: id
                    .optional()
                    .describe("Filter to transactions that have this tag ID."),
                is_group_parent: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, returns only transaction groups (group parents). If false, returns only non-group transactions.",
                    ),
                status: statusEnum
                    .optional()
                    .describe("Filter by transaction status."),
                is_pending: z
                    .boolean()
                    .optional()
                    .describe(
                        "Filter by pending status. true returns only pending transactions, false only non-pending. Takes precedence over include_pending when set.",
                    ),
                include_pending: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include imported pending transactions in results. Defaults to false. Ignored when is_pending is set.",
                    ),
                include_metadata: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include plaid_metadata and custom_metadata fields on each transaction.",
                    ),
                include_split_parents: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include the original parent transactions of split transactions.",
                    ),
                include_group_children: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include the original transactions that were combined into transaction groups.",
                    ),
                include_children: z
                    .boolean()
                    .optional()
                    .describe(
                        "Populate the `children` array on group parents with their grouped transactions, or, when include_split_parents is also set, on split parents with the transactions split from them.",
                    ),
                include_files: z
                    .boolean()
                    .optional()
                    .describe(
                        "Include the `files` array (attachment metadata) on each transaction.",
                    ),
                limit: z.coerce
                    .number()
                    .int()
                    .min(1)
                    .max(2000)
                    .optional()
                    .describe(
                        "Max transactions to return (1-2000, default 1000).",
                    ),
                offset: z.coerce
                    .number()
                    .int()
                    .optional()
                    .describe(
                        "Offset for pagination. Use with `has_more` from a previous response.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async (input) => {
            try {
                if (
                    (input.start_date === undefined) !==
                    (input.end_date === undefined)
                ) {
                    return errorResponse(
                        "Failed to get transactions: start_date and end_date must be provided together.",
                    );
                }

                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(input)) {
                    if (value === undefined || value === null) continue;
                    params.append(key, String(value));
                }

                const qs = params.toString();
                const response = await api.get(
                    `/transactions${qs ? `?${qs}` : ""}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get transactions",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get transactions");
            }
        },
    );

    server.registerTool(
        "get_single_transaction",
        {
            description:
                "Get details of a specific transaction. The response always includes plaid_metadata, custom_metadata, files, and (for split or group parents) the children array — none of which are returned by default in get_transactions.",
            inputSchema: {
                transaction_id: transactionId.describe(
                    "ID of the transaction to retrieve.",
                ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ transaction_id }) => {
            try {
                const response = await api.get(
                    `/transactions/${transaction_id}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get transaction",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get transaction");
            }
        },
    );

    server.registerTool(
        "create_transactions",
        {
            description:
                "Insert one or more transactions (1-500 per call). Returns inserted transactions plus any skipped duplicates.",
            inputSchema: {
                transactions: z
                    .array(insertTransactionSchema)
                    .min(1)
                    .max(500)
                    .describe("Array of transactions to insert (1-500)."),
                apply_rules: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, apply the rules associated with each transaction's manual_account_id. Defaults to false.",
                    ),
                skip_duplicates: z
                    .boolean()
                    .optional()
                    .describe(
                        "Flag transactions that match an existing transaction's date+payee+amount+account as duplicates and skip them. Note: external_id deduplication always runs regardless of this flag.",
                    ),
                skip_balance_update: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, do not update the balances of the manual accounts these transactions are inserted into.",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({
            transactions,
            apply_rules,
            skip_duplicates,
            skip_balance_update,
        }) => {
            try {
                const body: Record<string, unknown> = { transactions };
                if (apply_rules !== undefined) body.apply_rules = apply_rules;
                if (skip_duplicates !== undefined)
                    body.skip_duplicates = skip_duplicates;
                if (skip_balance_update !== undefined)
                    body.skip_balance_update = skip_balance_update;

                const response = await api.post("/transactions", body);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to create transactions",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to create transactions");
            }
        },
    );

    server.registerTool(
        "update_transaction",
        {
            description:
                "Update an existing transaction. Provide any subset of writable fields directly (the v2 API no longer wraps the body in a `transaction` envelope). Cannot modify split or grouped transactions; use the corresponding split/group tools instead.",
            inputSchema: {
                transaction_id: transactionId.describe(
                    "ID of the transaction to update.",
                ),
                update: updateTransactionFieldsSchema.describe(
                    "Fields to update. Provide at least one writable field. Nullable fields such as category_id accept null to clear them.",
                ),
                update_balance: z
                    .boolean()
                    .optional()
                    .describe(
                        "Defaults to true. Pass false to skip updating the associated manual account's balance.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ transaction_id, update, update_balance }) => {
            try {
                const path =
                    update_balance === undefined
                        ? `/transactions/${transaction_id}`
                        : `/transactions/${transaction_id}?update_balance=${update_balance}`;
                const response = await api.put(path, update);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update transaction",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to update transaction");
            }
        },
    );

    server.registerTool(
        "delete_transaction",
        {
            description:
                "Delete a single transaction. Fails for split/group transactions and their parents — unsplit/ungroup first. Irreversible.",
            inputSchema: {
                transaction_id: transactionId.describe(
                    "ID of the transaction to delete.",
                ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ transaction_id }) => {
            try {
                const response = await api.delete(
                    `/transactions/${transaction_id}`,
                );

                if (response.status === 204) {
                    return successResponse("Transaction deleted.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete transaction",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to delete transaction");
            }
        },
    );

    server.registerTool(
        "update_transactions_bulk",
        {
            description:
                "Update multiple transactions in a single call (1-500). Each entry must include `id` plus at least one writable field. Cannot be used to modify split or grouped transactions.",
            inputSchema: {
                transactions: z
                    .array(bulkUpdateEntrySchema)
                    .min(1)
                    .max(500)
                    .describe(
                        "Array of partial transaction updates, each keyed by its `id`.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({ transactions }) => {
            try {
                const response = await api.put("/transactions", {
                    transactions,
                });

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to bulk update transactions",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to bulk update transactions");
            }
        },
    );

    server.registerTool(
        "delete_transactions_bulk",
        {
            description:
                "Bulk-delete transactions by ID (1-500). Fails if any ID is a split or group parent, or part of a split/group; unsplit or ungroup those first. Irreversible.",
            inputSchema: {
                ids: z
                    .array(transactionId)
                    .min(1)
                    .max(500)
                    .describe("Array of transaction IDs to delete (1-500)."),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ ids }) => {
            try {
                const response = await api.delete("/transactions", { ids });

                if (response.status === 204) {
                    return successResponse(
                        `Deleted ${ids.length} transaction(s).`,
                    );
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to bulk delete transactions",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to bulk delete transactions");
            }
        },
    );

    server.registerTool(
        "create_transaction_group",
        {
            description:
                "Create a transaction group from 2-500 existing transactions. Source transactions are hidden from get_transactions; the new group's `children` are returned by get_single_transaction on the group's ID. Cannot include split or recurring transactions, and transactions that are already grouped must be ungrouped (delete_transaction_group) before being regrouped.",
            inputSchema: {
                ids: z
                    .array(transactionId)
                    .min(2)
                    .max(500)
                    .describe(
                        "IDs of existing transactions to group together (2-500). Split and recurring transactions cannot be grouped, and transactions already in a group must be ungrouped first.",
                    ),
                date: isoDate.describe(
                    "Date for the new grouped transaction (YYYY-MM-DD).",
                ),
                payee: z
                    .string()
                    .describe("Payee for the new grouped transaction."),
                category_id: id
                    .nullable()
                    .optional()
                    .describe(
                        "Category for the group. If unset and all children share a category, the group inherits it.",
                    ),
                notes: z
                    .string()
                    .nullable()
                    .optional()
                    .describe("Notes for the new grouped transaction."),
                status: writeStatusEnum
                    .optional()
                    .describe(
                        "Status for the new grouped transaction. Defaults to reviewed.",
                    ),
                tag_ids: z
                    .array(id)
                    .optional()
                    .describe("Tag IDs to apply to the new group."),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async (input) => {
            try {
                const body: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(input)) {
                    if (value === undefined) continue;
                    body[key] = value;
                }

                const response = await api.post("/transactions/group", body);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to create transaction group",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to create transaction group");
            }
        },
    );

    server.registerTool(
        "delete_transaction_group",
        {
            description:
                "Delete (ungroup) a transaction group. The original child transactions remain and revert to normal ungrouped transactions.",
            inputSchema: {
                transaction_id: transactionId.describe(
                    "ID of the transaction group (the group parent transaction) to delete.",
                ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ transaction_id }) => {
            try {
                const response = await api.delete(
                    `/transactions/group/${transaction_id}`,
                );

                if (response.status === 204) {
                    return successResponse("Transaction group ungrouped.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete transaction group",
                    );
                }

                return successResponse("Transaction group ungrouped.");
            } catch (error) {
                return catchError(error, "Failed to delete transaction group");
            }
        },
    );

    server.registerTool(
        "split_transaction",
        {
            description:
                "Split an existing transaction into 2-500 child transactions. The sum of child amounts must equal the parent's amount. After splitting, the parent is hidden from get_transactions and accessible via get_single_transaction (returns the parent with `children`).",
            inputSchema: {
                transaction_id: transactionId.describe(
                    "ID of the transaction to split.",
                ),
                child_transactions: z
                    .array(splitChildSchema)
                    .min(2)
                    .max(500)
                    .describe(
                        "Children to create (2-500). Sum of amounts must equal the parent's amount.",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({ transaction_id, child_transactions }) => {
            try {
                const response = await api.post(
                    `/transactions/split/${transaction_id}`,
                    { child_transactions },
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to split transaction",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to split transaction");
            }
        },
    );

    server.registerTool(
        "unsplit_transaction",
        {
            description:
                "Unsplit a previously split transaction by deleting its children and restoring the parent. Pass the parent (split_parent_id) — not a child — as the path id.",
            inputSchema: {
                transaction_id: transactionId.describe(
                    "ID of the previously split parent transaction. Use the split_parent_id of a split child to find it.",
                ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ transaction_id }) => {
            try {
                const response = await api.delete(
                    `/transactions/split/${transaction_id}`,
                );

                if (response.status === 204) {
                    return successResponse("Transaction unsplit.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to unsplit transaction",
                    );
                }

                return successResponse("Transaction unsplit.");
            } catch (error) {
                return catchError(error, "Failed to unsplit transaction");
            }
        },
    );

    server.registerTool(
        "attach_file_to_transaction",
        {
            description:
                "Attach a local image or PDF receipt (max 10MB) to a transaction. Allowed types: image/jpeg, image/png, image/heic, image/heif, application/pdf. The file is read from the local filesystem of the host running this MCP server, and its type is determined from its actual contents — files that are not a real image or PDF are rejected. If LUNCHMONEY_ATTACHMENTS_DIR is set on the host, only files inside that directory can be attached.",
            inputSchema: {
                transaction_id: transactionId.describe(
                    "ID of the transaction to attach the file to.",
                ),
                file_path: z
                    .string()
                    .describe(
                        "Absolute or relative path to the receipt file on the local filesystem. Must be a regular file whose contents are a JPEG, PNG, HEIC, HEIF, or PDF. If the host sets LUNCHMONEY_ATTACHMENTS_DIR, the path must resolve inside that directory.",
                    ),
                content_type: z
                    .enum(ALLOWED_ATTACHMENT_MIME_TYPES)
                    .optional()
                    .describe(
                        "Optional assertion of the file's MIME type. The server always determines the real type from the file contents; if this disagrees with it, the request is rejected. Omit unless you need that check.",
                    ),
                notes: z
                    .string()
                    .optional()
                    .describe("Optional notes describing the attachment."),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({ transaction_id, file_path, content_type, notes }) => {
            try {
                const file = await readAttachment(file_path);
                if (!file.ok) {
                    return errorResponse(
                        `Failed to attach file to transaction: ${file.message}`,
                    );
                }

                // The caller may assert a type, but the file's own bytes are
                // authoritative. A mismatch means the caller is confused about
                // what it is uploading, so refuse rather than silently
                // correcting it.
                if (
                    content_type !== undefined &&
                    !contentTypeMatches(content_type, file.mime)
                ) {
                    return errorResponse(
                        `Failed to attach file to transaction: declared content_type ${content_type} does not match the file's actual type ${file.mime}.`,
                    );
                }

                const blob = new Blob([new Uint8Array(file.data)], {
                    type: file.mime,
                });

                const formData = new FormData();
                formData.append("file", blob, basename(file_path));
                if (notes !== undefined) formData.append("notes", notes);

                const response = await api.upload(
                    `/transactions/${transaction_id}/attachments`,
                    formData,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to attach file to transaction",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(
                    error,
                    "Failed to attach file to transaction",
                );
            }
        },
    );

    server.registerTool(
        "get_transaction_attachment_url",
        {
            description:
                "Get a short-lived signed download URL for a transaction file attachment. The response includes the URL and an `expires_at` timestamp.",
            inputSchema: {
                file_id: id.describe("ID of the file attachment."),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ file_id }) => {
            try {
                const response = await api.get(
                    `/transactions/attachments/${file_id}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get attachment URL",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get attachment URL");
            }
        },
    );

    server.registerTool(
        "delete_transaction_attachment",
        {
            description: "Delete a transaction file attachment. Irreversible.",
            inputSchema: {
                file_id: id.describe("ID of the file attachment to delete."),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ file_id }) => {
            try {
                const response = await api.delete(
                    `/transactions/attachments/${file_id}`,
                );

                if (response.status === 204) {
                    return successResponse("Attachment deleted.");
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete attachment",
                    );
                }

                return successResponse("Attachment deleted.");
            } catch (error) {
                return catchError(error, "Failed to delete attachment");
            }
        },
    );
}
