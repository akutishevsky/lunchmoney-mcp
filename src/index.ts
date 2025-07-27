import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Config, initializeConfig, getConfig } from "./config.js";
import { User, CategoryChild, Category } from "./types.js";

const server = new McpServer({
    name: "lunchmoney-mcp",
    version: "1.0.0",
    capabilities: {
        tools: {},
    },
});

server.tool("get_user", "Get details on the current user", {}, async () => {
    const { baseUrl, lunchmoneyApiToken } = getConfig();
    const response = await fetch(`${baseUrl}/me`, {
        headers: {
            Authorization: `Bearer ${lunchmoneyApiToken}`,
        },
    });

    if (!response.ok) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to get user details: ${response.statusText}`,
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
});

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
        }),
    },
    async ({ input }) => {
        const format = input.format || "flattened";
        const { baseUrl, lunchmoneyApiToken } = getConfig();
        const response = await fetch(`${baseUrl}/categories?format=${format}`, {
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

(async () => {
    try {
        initializeConfig();

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Lunchmoney MCP Server running on stdio");
    } catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
})();
