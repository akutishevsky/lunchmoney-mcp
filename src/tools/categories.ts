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
import { formatData } from "../format.js";
import { id, int64Id } from "../schemas.js";
import { Category } from "../types.js";

// children entries: an existing category ID (int32), a new child name, or an
// existing category object (only its id is sent). IDs are strict numbers here,
// not the coerced `id` validator, so a new child named "2024" stays a name
// instead of being coerced into category ID 2024.
const childEntry = z.union([
    z.number().int().min(-2147483648).max(2147483647),
    z.string().min(1).max(100),
    z
        .object({ id: z.number().int().min(-2147483648).max(2147483647) })
        .transform((category) => category.id),
]);

export function registerCategoryTools(server: McpServer) {
    server.registerTool(
        "get_all_categories",
        {
            description:
                "Get a list of all categories associated with the user's account. Categories are sorted by their order; categories without an order are listed alphabetically after those that have one.",
            inputSchema: {
                format: z
                    .enum(["flattened", "nested"])
                    .optional()
                    .describe(
                        "If `flattened`, returns the same top-level categories as `nested`, plus grouped categories also appear at the top level alongside their category groups. If `nested`, returns top-level categories (either category groups or categories not part of a category group) in an array, with grouped categories nested within their category group under the property children. Ignored when is_group is set. Defaults to nested.",
                    ),
                is_group: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, returns only category groups. If false, returns only categories that are not part of a category group (grouped categories are excluded). When set, format is ignored.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ format, is_group }) => {
            try {
                const params = new URLSearchParams();
                if (format) params.append("format", format);
                if (is_group !== undefined)
                    params.append("is_group", String(is_group));

                const qs = params.toString();
                const response = await api.get(
                    `/categories${qs ? `?${qs}` : ""}`,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get all categories",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get all categories");
            }
        },
    );

    server.registerTool(
        "get_single_category",
        {
            description:
                "Get details on a single category or category group, including the list of children categories for category groups.",
            inputSchema: {
                categoryId: id.describe(
                    "Id of the category to query. Call get_all_categories first to discover ids.",
                ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ categoryId }) => {
            try {
                const response = await api.get(`/categories/${categoryId}`);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to get single category",
                    );
                }

                const category: Category = await response.json();

                return dataResponse(category);
            } catch (error) {
                return catchError(error, "Failed to get single category");
            }
        },
    );

    server.registerTool(
        "create_category",
        {
            description:
                "Create a new category or a category group. Set is_group=true to create a category group; supply children as an array of existing category IDs, existing category objects, and/or strings (names of new sub-categories to create).",
            inputSchema: {
                name: z
                    .string()
                    .min(1)
                    .max(100)
                    .describe(
                        "Name of the category. 1-100 characters. Must not match an existing category or category group name.",
                    ),
                description: z
                    .string()
                    .max(200)
                    .nullable()
                    .optional()
                    .describe(
                        "Optional description. Up to 200 characters. Null is the same as omitting it.",
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .describe(
                        "Whether transactions in this category should be treated as income.",
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .describe(
                        "Whether transactions in this category should be excluded from budgets.",
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .describe(
                        "Whether transactions in this category should be excluded from calculated totals.",
                    ),
                archived: z
                    .boolean()
                    .optional()
                    .describe("Whether the category should be archived."),
                is_group: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, creates a category group instead of a category. When true, group_id may not be set; use children to assign existing categories.",
                    ),
                group_id: int64Id
                    .nullable()
                    .optional()
                    .describe(
                        "If set, assigns the new category to an existing category group. Cannot be set if is_group is true. Null is the same as omitting it.",
                    ),
                children: z
                    .array(childEntry)
                    .optional()
                    .describe(
                        "Only valid when is_group is true. Array of existing category IDs (numbers), existing category objects (their id is used), and/or names of new sub-categories to create (strings). Categories must already exist and cannot be category groups; ones already in another group are moved.",
                    ),
                order: z
                    .number()
                    .int()
                    .nullable()
                    .optional()
                    .describe(
                        "Position of the category on the categories page in the Lunch Money app. For categories in a group, the position is relative to the other categories in that group. Usually managed by the user in the app.",
                    ),
                collapsed: z
                    .boolean()
                    .nullable()
                    .optional()
                    .describe(
                        "If true, the category group appears collapsed in the Lunch Money app. Can only be true for category groups (requires is_group=true). Usually managed by the user in the app.",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({
            name,
            description,
            is_income,
            exclude_from_budget,
            exclude_from_totals,
            archived,
            is_group,
            group_id,
            children,
            order,
            collapsed,
        }) => {
            try {
                if (children !== undefined && is_group !== true) {
                    return errorResponse(
                        "children can only be set when is_group is true.",
                    );
                }
                if (
                    is_group === true &&
                    group_id !== undefined &&
                    group_id !== null
                ) {
                    return errorResponse(
                        "group_id cannot be set when is_group is true. Use children to add existing categories to the new group.",
                    );
                }
                if (collapsed === true && is_group !== true) {
                    return errorResponse(
                        "collapsed can only be true for category groups. Set is_group=true.",
                    );
                }

                const requestBody: Record<string, unknown> = { name };

                if (description !== undefined)
                    requestBody.description = description;
                if (is_income !== undefined) requestBody.is_income = is_income;
                if (exclude_from_budget !== undefined)
                    requestBody.exclude_from_budget = exclude_from_budget;
                if (exclude_from_totals !== undefined)
                    requestBody.exclude_from_totals = exclude_from_totals;
                if (archived !== undefined) requestBody.archived = archived;
                if (is_group !== undefined) requestBody.is_group = is_group;
                if (group_id !== undefined) requestBody.group_id = group_id;
                if (children !== undefined) requestBody.children = children;
                if (order !== undefined) requestBody.order = order;
                if (collapsed !== undefined) requestBody.collapsed = collapsed;

                const response = await api.post("/categories", requestBody);

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to create category",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to create category");
            }
        },
    );

    server.registerTool(
        "update_category",
        {
            description:
                "Update properties for an existing category or category group. Provide at least one updatable property. For category groups, supplying children replaces the group's full child list. Cannot be used to convert between category and category group.",
            inputSchema: {
                categoryId: id.describe(
                    "Id of the category or category group to update.",
                ),
                name: z
                    .string()
                    .min(1)
                    .max(100)
                    .optional()
                    .describe(
                        "New name. 1-100 characters. Must not match an existing category or category group name.",
                    ),
                description: z
                    .string()
                    .max(200)
                    .nullable()
                    .optional()
                    .describe(
                        "New description. Up to 200 characters. Send null to clear the existing description.",
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .describe(
                        "Whether transactions in this category should be treated as income.",
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .describe(
                        "Whether transactions in this category should be excluded from budgets.",
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .describe(
                        "Whether transactions in this category should be excluded from calculated totals.",
                    ),
                archived: z
                    .boolean()
                    .optional()
                    .describe("Whether the category should be archived."),
                archived_at: z
                    .string()
                    .datetime({ offset: true })
                    .nullable()
                    .optional()
                    .describe(
                        "ISO 8601 datetime of when the category was archived. Send null to clear it.",
                    ),
                group_id: int64Id
                    .nullable()
                    .optional()
                    .describe(
                        "Move this category into the specified category group, or null to remove from any group. Not applicable to category groups.",
                    ),
                children: z
                    .array(childEntry)
                    .optional()
                    .describe(
                        "Only valid for category groups. Replaces the group's full children list. Existing category IDs (numbers), existing category objects (their id is used), and/or new sub-category names (strings). Categories must already exist and cannot be category groups; ones already in another group are moved.",
                    ),
                collapsed: z
                    .boolean()
                    .nullable()
                    .optional()
                    .describe(
                        "If true, the category group is collapsed in the Lunch Money app. Usually set by the user in the app, but settable via the API.",
                    ),
                is_group: z
                    .boolean()
                    .nullable()
                    .optional()
                    .describe(
                        "Tolerated by the API but cannot be changed. Only send it to confirm the current type; a different value returns an error. Does not count as an update on its own.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            categoryId,
            name,
            description,
            is_income,
            exclude_from_budget,
            exclude_from_totals,
            archived,
            archived_at,
            group_id,
            children,
            collapsed,
            is_group,
        }) => {
            try {
                const hasUpdate = [
                    name,
                    description,
                    is_income,
                    exclude_from_budget,
                    exclude_from_totals,
                    archived,
                    archived_at,
                    group_id,
                    children,
                    collapsed,
                ].some((value) => value !== undefined);
                if (!hasUpdate) {
                    return errorResponse(
                        "No properties to update. Provide at least one of: name, description, is_income, exclude_from_budget, exclude_from_totals, archived, archived_at, group_id, children, collapsed. is_group alone does not count.",
                    );
                }

                const requestBody: Record<string, unknown> = {};

                if (name !== undefined) requestBody.name = name;
                if (description !== undefined)
                    requestBody.description = description;
                if (is_income !== undefined) requestBody.is_income = is_income;
                if (exclude_from_budget !== undefined)
                    requestBody.exclude_from_budget = exclude_from_budget;
                if (exclude_from_totals !== undefined)
                    requestBody.exclude_from_totals = exclude_from_totals;
                if (archived !== undefined) requestBody.archived = archived;
                if (archived_at !== undefined)
                    requestBody.archived_at = archived_at;
                if (group_id !== undefined) requestBody.group_id = group_id;
                if (children !== undefined) requestBody.children = children;
                if (collapsed !== undefined) requestBody.collapsed = collapsed;
                if (is_group !== undefined) requestBody.is_group = is_group;

                const response = await api.put(
                    `/categories/${categoryId}`,
                    requestBody,
                );

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to update category",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to update category");
            }
        },
    );

    server.registerTool(
        "delete_category",
        {
            description:
                "Delete a single category or category group. By default fails (HTTP 422) if dependencies exist, returning a structured `dependents` payload. Set force=true to delete and disassociate from all related budgets, transactions, recurring items, etc. Force delete is irreversible.",
            inputSchema: {
                category_id: id.describe(
                    "Id of the category or category group to delete.",
                ),
                force: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, force deletion even if dependencies exist (irreversible).",
                    ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ category_id, force }) => {
            try {
                const path = force
                    ? `/categories/${category_id}?force=true`
                    : `/categories/${category_id}`;
                const response = await api.delete(path);

                if (response.status === 204) {
                    return successResponse("Category deleted.");
                }

                // 422 means the category was not deleted because budgets,
                // transactions, recurring items or child categories still
                // reference it. Surface it as an error with the dependents
                // payload so the model can decide whether to force.
                if (response.status === 422) {
                    const body = await response.text();
                    let payload: unknown = body;
                    try {
                        payload = JSON.parse(body);
                    } catch {
                        // Not JSON; keep the raw text.
                    }
                    return errorResponse(
                        `Category not deleted because it still has dependents (422). Set force=true to delete it and disassociate it from these records.\n${formatData(payload)}`,
                    );
                }

                if (!response.ok) {
                    return handleApiError(
                        response,
                        "Failed to delete category",
                    );
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to delete category");
            }
        },
    );
}
