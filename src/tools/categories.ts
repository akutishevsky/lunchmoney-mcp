import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { formatData } from "../format.js";
import { Category, CategoryChild } from "../types.js";

export function registerCategoryTools(server: McpServer) {
    server.registerTool(
        "get_all_categories",
        {
            description:
                "Get a flattened list of all categories in alphabetical order associated with the user's account.",
            inputSchema: {
                format: z
                    .string()
                    .optional()
                    .describe(
                        "Can either flattened or nested. If flattened, returns a singular array of categories, ordered alphabetically. If nested, returns top-level categories (either category groups or categories not part of a category group) in an array. Subcategories are nested within the category group under the property children.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ format: formatParam }) => {
            try {
                const format = formatParam || "flattened";
                const { baseUrl, lunchmoneyApiToken } = getConfig();
                const response = await fetch(
                    `${baseUrl}/categories?format=${format}`,
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
                            "Failed to get all categories",
                        ),
                    );
                }

                const categories: Category[] = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(categories),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to get all categories");
            }
        },
    );

    server.registerTool(
        "get_single_category",
        {
            description:
                "Get hydrated details on a single category. Note that if this category is part of a category group, its properties (is_income, exclude_from_budget, exclude_from_totals) will inherit from the category group.",
            inputSchema: {
                categoryId: z
                    .string()
                    .describe(
                        "Id of the category to query. Should call the get_all_categories tool first to get the ids.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ categoryId }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();
                const response = await fetch(
                    `${baseUrl}/categories/${categoryId}`,
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
                            "Failed to get single category",
                        ),
                    );
                }

                const category: Category = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(category),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to get single category");
            }
        },
    );

    server.registerTool(
        "create_category",
        {
            description: "Create a single category.",
            inputSchema: {
                name: z
                    .string()
                    .describe(
                        "Name of category. Must be between 1 and 40 characters.",
                    ),
                description: z
                    .string()
                    .optional()
                    .default("")
                    .describe(
                        "Description of category. Must be less than 140 characters.",
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be treated as income.",
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from budgets.",
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from calculated totals.",
                    ),
                archived: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe("Whether or not category should be archived."),
                group_id: z
                    .number()
                    .optional()
                    .describe(
                        "Assigns the newly-created category to an existing category group.",
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
            group_id,
        }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();
                const requestBody: any = {
                    name,
                    description,
                    is_income,
                    exclude_from_budget,
                    exclude_from_totals,
                    archived,
                };

                if (group_id !== undefined) {
                    requestBody.group_id = group_id;
                }

                const response = await fetch(`${baseUrl}/categories`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to create category",
                        ),
                    );
                }

                const category: Category = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(category),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to create category");
            }
        },
    );

    server.registerTool(
        "create_category_group",
        {
            description: "Create a single category group.",
            inputSchema: {
                name: z
                    .string()
                    .describe(
                        "Name of category. Must be between 1 and 40 characters.",
                    ),
                description: z
                    .string()
                    .optional()
                    .default("")
                    .describe(
                        "Description of category. Must be less than 140 characters.",
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be treated as income.",
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from budgets.",
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from calculated totals.",
                    ),
                category_ids: z
                    .array(z.number())
                    .optional()
                    .describe(
                        "Array of category_id to include in the category group.",
                    ),
                new_categories: z
                    .array(z.string())
                    .optional()
                    .describe(
                        "Array of strings representing new categories to create and subsequently include in the category group.",
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
            category_ids,
            new_categories,
        }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();
                const requestBody: any = {
                    name,
                    description,
                    is_income,
                    exclude_from_budget,
                    exclude_from_totals,
                    category_ids,
                    new_categories,
                };

                if (category_ids && category_ids.length > 0) {
                    requestBody.category_ids = category_ids;
                }

                if (new_categories && new_categories.length > 0) {
                    requestBody.new_categories = new_categories;
                }

                const response = await fetch(`${baseUrl}/categories/group`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to create category group",
                        ),
                    );
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(await response.json()),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to create category group");
            }
        },
    );

    server.registerTool(
        "update_category",
        {
            description:
                "Update the properties for a single category or category group.",
            inputSchema: {
                name: z
                    .string()
                    .describe(
                        "Name of category. Must be between 1 and 40 characters.",
                    ),
                categoryId: z
                    .string()
                    .describe(
                        "Id of the category or category group to update. Execute the get_all_categories tool first, to get the category ids.",
                    ),
                description: z
                    .string()
                    .optional()
                    .default("")
                    .describe(
                        "Description of category. Must be less than 140 characters.",
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be treated as income.",
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from budgets.",
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from calculated totals.",
                    ),
                archived: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe("Whether or not category should be archived."),
                group_id: z
                    .number()
                    .optional()
                    .describe(
                        "Assigns the newly-created category to an existing category group.",
                    ),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            name,
            categoryId,
            description,
            is_income,
            exclude_from_budget,
            exclude_from_totals,
            archived,
            group_id,
        }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();
                const requestBody: any = {
                    name,
                    description,
                    is_income,
                    exclude_from_budget,
                    exclude_from_totals,
                    archived,
                };

                if (group_id !== undefined) {
                    requestBody.group_id = group_id;
                }

                const response = await fetch(
                    `${baseUrl}/categories/${categoryId}`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(requestBody),
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to update category",
                        ),
                    );
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(await response.json()),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to update category");
            }
        },
    );

    server.registerTool(
        "add_to_category_group",
        {
            description:
                "Add categories (either existing or new) to a single category group.",
            inputSchema: {
                group_id: z
                    .number()
                    .describe("Id of the parent group to add to."),
                category_ids: z
                    .array(z.number())
                    .optional()
                    .describe(
                        "Array of category_id to include in the category group.",
                    ),
                new_categories: z
                    .array(z.string())
                    .optional()
                    .describe(
                        "Array of strings representing new categories to create and subsequently include in the category group.",
                    ),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({ group_id, category_ids, new_categories }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();
                const requestBody: any = {};

                if (category_ids && category_ids.length > 0) {
                    requestBody.category_ids = category_ids;
                }

                if (new_categories && new_categories.length > 0) {
                    requestBody.new_categories = new_categories;
                }

                const response = await fetch(
                    `${baseUrl}/categories/group/${group_id}/add`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${lunchmoneyApiToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(requestBody),
                    },
                );

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to add to category group",
                        ),
                    );
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(await response.json()),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to add to category group");
            }
        },
    );

    server.registerTool(
        "delete_category",
        {
            description:
                "Delete a single category or category group. This will only work if there are no dependencies, such as existing budgets for the category, categorized transactions, categorized recurring items, etc. If there are dependents, this endpoint will return what the dependents are and how many there are.",
            inputSchema: {
                category_id: z
                    .number()
                    .optional()
                    .describe(
                        "Id of the category or the category group to delete.",
                    ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ category_id }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(
                    `${baseUrl}/categories/${category_id}`,
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
                            "Failed to delete category",
                        ),
                    );
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(await response.json()),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to delete category");
            }
        },
    );

    server.registerTool(
        "force_delete_category",
        {
            description:
                "Delete a single category or category group and along with it, disassociate the category from any transactions, recurring items, budgets, etc. Note: it is best practice to first try the Delete Category endpoint to ensure you don't accidentally delete any data. Disassociation/deletion of the data arising from this endpoint is irreversible!",
            inputSchema: {
                category_id: z
                    .number()
                    .optional()
                    .describe(
                        "Id of the category or the category group to delete.",
                    ),
            },
            annotations: {
                destructiveHint: true,
            },
        },
        async ({ category_id }) => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();

                const response = await fetch(
                    `${baseUrl}/categories/${category_id}/force`,
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
                            "Failed to force delete category",
                        ),
                    );
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(await response.json()),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to force delete category");
            }
        },
    );
}
