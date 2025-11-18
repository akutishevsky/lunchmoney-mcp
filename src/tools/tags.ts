import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getConfig } from "../config.js";
import { Tag } from "../types.js";

export function registerTagTools(server: McpServer) {
    server.tool(
        "get_all_tags",
        "Get a list of all tags associated with the user's account.",
        {},
        async () => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const response = await fetch(`${baseUrl}/tags`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get all tags: ${response.statusText}`,
                        },
                    ],
                };
            }

            const tags: Tag[] = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tags),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_tag",
        "Get a single tag by ID.",
        {
            input: z.object({
                tag_id: z.number().describe("ID of the tag to retrieve"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const response = await fetch(`${baseUrl}/tags/${input.tag_id}`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to get tag: ${response.statusText}`,
                        },
                    ],
                };
            }

            const tag: Tag = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tag),
                    },
                ],
            };
        }
    );

    server.tool(
        "create_tag",
        "Create a new tag.",
        {
            input: z.object({
                name: z
                    .string()
                    .describe("Name of the tag (1-50 characters)"),
                description: z
                    .string()
                    .optional()
                    .describe("Description of the tag"),
                archived: z
                    .boolean()
                    .optional()
                    .describe("Whether the tag should be archived"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const body: any = {
                name: input.name,
            };

            if (input.description !== undefined)
                body.description = input.description;
            if (input.archived !== undefined) body.archived = input.archived;

            const response = await fetch(`${baseUrl}/tags`, {
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
                            text: `Failed to create tag: ${response.statusText}`,
                        },
                    ],
                };
            }

            const tag: Tag = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tag),
                    },
                ],
            };
        }
    );

    server.tool(
        "update_tag",
        "Update an existing tag.",
        {
            input: z.object({
                tag_id: z.number().describe("ID of the tag to update"),
                name: z
                    .string()
                    .optional()
                    .describe("New name of the tag (1-50 characters)"),
                description: z
                    .string()
                    .optional()
                    .describe("New description of the tag"),
                archived: z
                    .boolean()
                    .optional()
                    .describe("Whether the tag should be archived"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const body: any = {};

            if (input.name !== undefined) body.name = input.name;
            if (input.description !== undefined)
                body.description = input.description;
            if (input.archived !== undefined) body.archived = input.archived;

            const response = await fetch(`${baseUrl}/tags/${input.tag_id}`, {
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
                            text: `Failed to update tag: ${response.statusText}`,
                        },
                    ],
                };
            }

            const tag: Tag = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(tag),
                    },
                ],
            };
        }
    );

    server.tool(
        "delete_tag",
        "Delete a tag.",
        {
            input: z.object({
                tag_id: z.number().describe("ID of the tag to delete"),
            }),
        },
        async ({ input }) => {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const response = await fetch(`${baseUrl}/tags/${input.tag_id}`, {
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
                            text: `Failed to delete tag: ${response.statusText}`,
                        },
                    ],
                };
            }

            return {
                content: [
                    {
                        type: "text",
                        text: "Tag deleted successfully",
                    },
                ],
            };
        }
    );
}