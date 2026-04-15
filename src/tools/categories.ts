import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    handleApiError,
    catchError,
    successResponse,
} from "../api.js";
import { Category } from "../types.js";

export function registerCategoryTools(server: McpServer) {
    server.registerTool(
        "get_all_categories",
        {
            description:
                "Get a list of all categories associated with the user's account. Returns categories in alphabetical order.",
            inputSchema: {
                format: z
                    .enum(["flattened", "nested"])
                    .optional()
                    .describe(
                        "If `flattened`, returns a singular array of categories. If `nested`, returns top-level categories (either category groups or categories not part of a category group) in an array, with subcategories nested within the category group under the property children. Defaults to flattened.",
                    ),
                is_group: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, returns only category groups. If false, returns only categories that are not category groups.",
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
                categoryId: z.coerce
                    .number()
                    .describe(
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
                "Create a new category or a category group. Set is_group=true to create a category group; supply children as an array of existing category IDs and/or strings (names of new sub-categories to create).",
            inputSchema: {
                name: z
                    .string()
                    .min(1)
                    .max(100)
                    .describe("Name of the category. 1-100 characters."),
                description: z
                    .string()
                    .max(200)
                    .optional()
                    .describe("Optional description. Up to 200 characters."),
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
                group_id: z.coerce
                    .number()
                    .optional()
                    .describe(
                        "If set, assigns the new category to an existing category group. Cannot be set if is_group is true.",
                    ),
                children: z
                    .array(z.union([z.coerce.number(), z.string()]))
                    .optional()
                    .describe(
                        "Only valid when is_group is true. Array of existing category IDs (numbers) and/or names of new sub-categories to create (strings).",
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
        }) => {
            try {
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
                "Update properties for an existing category or category group. For category groups, supplying children replaces the group's full child list. Cannot be used to convert between category and category group.",
            inputSchema: {
                categoryId: z.coerce
                    .number()
                    .describe(
                        "Id of the category or category group to update.",
                    ),
                name: z
                    .string()
                    .min(1)
                    .max(100)
                    .optional()
                    .describe("New name. 1-100 characters."),
                description: z
                    .string()
                    .max(200)
                    .optional()
                    .describe("New description. Up to 200 characters."),
                is_income: z.boolean().optional(),
                exclude_from_budget: z.boolean().optional(),
                exclude_from_totals: z.boolean().optional(),
                archived: z.boolean().optional(),
                group_id: z.coerce
                    .number()
                    .nullable()
                    .optional()
                    .describe(
                        "Move this category into the specified category group, or null to remove from any group.",
                    ),
                children: z
                    .array(z.union([z.coerce.number(), z.string()]))
                    .optional()
                    .describe(
                        "Only valid for category groups. Replaces the group's full children list. Existing IDs (numbers) keep/move categories; strings create new sub-categories.",
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
            group_id,
            children,
        }) => {
            try {
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
                if (group_id !== undefined) requestBody.group_id = group_id;
                if (children !== undefined) requestBody.children = children;

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
                category_id: z.coerce
                    .number()
                    .describe(
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

                if (!response.ok) {
                    if (response.status === 422) {
                        return dataResponse(await response.json());
                    }
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
