import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { Category, CategoryChild } from "../types.js";

export function registerCategoryTools(server: McpServer) {
    server.tool(
        "get_all_categories",
        "Get a flattened list of all categories in alphabetical order associated with the user's account.",
        {
            input: z.object({
                format: z
                    .string()
                    .optional()
                    .describe(
                        "Can either flattened or nested. If flattened, returns a singular array of categories, ordered alphabetically. If nested, returns top-level categories (either category groups or categories not part of a category group) in an array. Subcategories are nested within the category group under the property children."
                    ),
                is_group: z
                    .boolean()
                    .optional()
                    .describe("Filter by groups only (true) or non-groups only (false)"),
            }),
        },
        async ({ input }) => {
            const format = input.format || "flattened";
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const params = new URLSearchParams();
            params.append("format", format);
            if (input.is_group !== undefined) {
                params.append("is_group", input.is_group.toString());
            }

            const response = await fetch(`${baseUrl}/categories?${params}`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get all categories: ${response.statusText}`,
                        },
                    ],
                };
            }

            const categories: Category[] = await response.json();
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(categories),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_single_category",
        "Get hydrated details on a single category. Note that if this category is part of a category group, its properties (is_income, exclude_from_budget, exclude_from_totals) will inherit from the category group.",
        {
            input: z.object({
                categoryId: z
                    .string()
                    .describe(
                        "Id of the category to query. Should call the get_all_categories tool first to get the ids."
                    ),
            }),
        },
        async ({ input }) => {
            const { categoryId } = input;
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const response = await fetch(`${baseUrl}/categories/${categoryId}`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get single category: ${response.statusText}`,
                        },
                    ],
                };
            }

            const category: Category = await response.json();
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(category),
                    },
                ],
            };
        }
    );

    server.tool(
        "create_category",
        "Create a single category.",
        {
            input: z.object({
                name: z
                    .string()
                    .describe(
                        "Name of category. Must be between 1 and 40 characters."
                    ),
                description: z
                    .string()
                    .optional()
                    .default("")
                    .describe(
                        "Description of category. Must be less than 140 characters."
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be treated as income."
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from budgets."
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from calculated totals."
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
                        "Assigns the newly-created category to an existing category group."
                    ),
            }),
        },
        async ({ input }) => {
            const {
                name,
                description,
                is_income,
                exclude_from_budget,
                exclude_from_totals,
                archived,
                group_id,
            } = input;
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
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to create a single category: ${response.statusText}`,
                        },
                    ],
                };
            }

            const category: Category = await response.json();
            
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(category),
                    },
                ],
            };
        }
    );

    server.tool(
        "create_category_group",
        "Create a single category group. In API v2, use the same endpoint as creating a category with is_group=true.",
        {
            input: z.object({
                name: z
                    .string()
                    .describe(
                        "Name of category. Must be between 1 and 40 characters."
                    ),
                description: z
                    .string()
                    .optional()
                    .default("")
                    .describe(
                        "Description of category. Must be less than 140 characters."
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be treated as income."
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from budgets."
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from calculated totals."
                    ),
                children: z
                    .array(z.number())
                    .optional()
                    .describe(
                        "Array of category IDs to include in this group."
                    ),
            }),
        },
        async ({ input }) => {
            const {
                name,
                description,
                is_income,
                exclude_from_budget,
                exclude_from_totals,
                children,
            } = input;
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const requestBody: any = {
                name,
                description,
                is_income,
                exclude_from_budget,
                exclude_from_totals,
                is_group: true,
            };

            if (children && children.length > 0) {
                requestBody.children = children;
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
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to create a single category group: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(await response.json()),
                    },
                ],
            };
        }
    );

    server.tool(
        "update_category",
        "Update the properties for a single category or category group.",
        {
            input: z.object({
                name: z
                    .string()
                    .describe(
                        "Name of category. Must be between 1 and 40 characters."
                    ),
                categoryId: z
                    .string()
                    .describe(
                        "Id of the category or category group to update. Execute the get_all_categories tool first, to get the category ids."
                    ),
                description: z
                    .string()
                    .optional()
                    .default("")
                    .describe(
                        "Description of category. Must be less than 140 characters."
                    ),
                is_income: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be treated as income."
                    ),
                exclude_from_budget: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from budgets."
                    ),
                exclude_from_totals: z
                    .boolean()
                    .optional()
                    .default(false)
                    .describe(
                        "Whether or not transactions in this category should be excluded from calculated totals."
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
                        "Assigns the newly-created category to an existing category group."
                    ),
            }),
        },
        async ({ input }) => {
            const {
                name,
                categoryId,
                description,
                is_income,
                exclude_from_budget,
                exclude_from_totals,
                archived,
                group_id,
            } = input;
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

            const response = await fetch(`${baseUrl}/categories/${categoryId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to update a single category: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(await response.json()),
                    },
                ],
            };
        }
    );

    server.tool(
        "add_to_category_group",
        "Add categories to a single category group using PUT with children array in API v2.",
        {
            input: z.object({
                group_id: z.number().describe("Id of the parent group to add to."),
                children: z
                    .array(z.number())
                    .describe(
                        "Array of category IDs to include in the category group."
                    ),
            }),
        },
        async ({ input }) => {
            const { group_id, children } = input;
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const requestBody: any = {
                children,
            };

            const response = await fetch(
                `${baseUrl}/categories/${group_id}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to add to a single category group: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(await response.json()),
                    },
                ],
            };
        }
    );

    server.tool(
        "delete_category",
        "Delete a single category or category group. This will only work if there are no dependencies, such as existing budgets for the category, categorized transactions, categorized recurring items, etc. If there are dependents, this endpoint will return what the dependents are and how many there are.",
        {
            input: z.object({
                category_id: z
                    .number()
                    .optional()
                    .describe(
                        "Id of the category or the category group to delete."
                    ),
            }),
        },
        async ({ input }) => {
            const { category_id } = input;
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(`${baseUrl}/categories/${category_id}`, {
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
                            text: `Failed to delete a single category or category group: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(await response.json()),
                    },
                ],
            };
        }
    );

    server.tool(
        "force_delete_category",
        "Delete a single category or category group and along with it, disassociate the category from any transactions, recurring items, budgets, etc. In API v2, use ?force=true query parameter. Note: it is best practice to first try the Delete Category endpoint to ensure you don't accidentally delete any data. Disassociation/deletion of the data arising from this endpoint is irreversible!",
        {
            input: z.object({
                category_id: z
                    .number()
                    .optional()
                    .describe(
                        "Id of the category or the category group to delete."
                    ),
            }),
        },
        async ({ input }) => {
            const { category_id } = input;
            const { baseUrl, lunchmoneyApiToken } = getConfig();

            const response = await fetch(
                `${baseUrl}/categories/${category_id}?force=true`,
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
                            text: `Failed to force delete a single category or category group: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(await response.json()),
                    },
                ],
            };
        }
    );
}