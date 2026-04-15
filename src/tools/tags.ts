import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
    api,
    dataResponse,
    handleApiError,
    catchError,
    successResponse,
} from "../api.js";

export function registerTagTools(server: McpServer) {
    server.registerTool(
        "get_all_tags",
        {
            description:
                "Get a list of all tags associated with the user's account.",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/tags");

                if (!response.ok) {
                    return handleApiError(response, "Failed to get tags");
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get tags");
            }
        },
    );

    server.registerTool(
        "get_single_tag",
        {
            description: "Get details of a single tag by ID.",
            inputSchema: {
                tagId: z.coerce
                    .number()
                    .describe(
                        "Id of the tag to query. Call get_all_tags first to discover ids.",
                    ),
            },
            annotations: {
                readOnlyHint: true,
            },
        },
        async ({ tagId }) => {
            try {
                const response = await api.get(`/tags/${tagId}`);

                if (!response.ok) {
                    return handleApiError(response, "Failed to get tag");
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to get tag");
            }
        },
    );

    server.registerTool(
        "create_tag",
        {
            description: "Create a new tag.",
            inputSchema: {
                name: z
                    .string()
                    .min(1)
                    .max(100)
                    .describe("Name of the tag. 1-100 characters."),
                description: z
                    .string()
                    .max(200)
                    .optional()
                    .describe("Optional description. Up to 200 characters."),
                text_color: z
                    .string()
                    .optional()
                    .describe("Optional text color of the tag."),
                background_color: z
                    .string()
                    .optional()
                    .describe("Optional background color of the tag."),
                archived: z
                    .boolean()
                    .optional()
                    .describe("If true, the tag is created archived."),
            },
            annotations: {
                idempotentHint: false,
            },
        },
        async ({
            name,
            description,
            text_color,
            background_color,
            archived,
        }) => {
            try {
                const requestBody: Record<string, unknown> = { name };
                if (description !== undefined)
                    requestBody.description = description;
                if (text_color !== undefined)
                    requestBody.text_color = text_color;
                if (background_color !== undefined)
                    requestBody.background_color = background_color;
                if (archived !== undefined) requestBody.archived = archived;

                const response = await api.post("/tags", requestBody);

                if (!response.ok) {
                    return handleApiError(response, "Failed to create tag");
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to create tag");
            }
        },
    );

    server.registerTool(
        "update_tag",
        {
            description: "Update properties for an existing tag.",
            inputSchema: {
                tagId: z.coerce.number().describe("Id of the tag to update."),
                name: z.string().min(1).max(100).optional(),
                description: z.string().max(200).nullable().optional(),
                text_color: z.string().nullable().optional(),
                background_color: z.string().nullable().optional(),
                archived: z.boolean().optional(),
            },
            annotations: {
                idempotentHint: true,
            },
        },
        async ({
            tagId,
            name,
            description,
            text_color,
            background_color,
            archived,
        }) => {
            try {
                const requestBody: Record<string, unknown> = {};
                if (name !== undefined) requestBody.name = name;
                if (description !== undefined)
                    requestBody.description = description;
                if (text_color !== undefined)
                    requestBody.text_color = text_color;
                if (background_color !== undefined)
                    requestBody.background_color = background_color;
                if (archived !== undefined) requestBody.archived = archived;

                const response = await api.put(`/tags/${tagId}`, requestBody);

                if (!response.ok) {
                    return handleApiError(response, "Failed to update tag");
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to update tag");
            }
        },
    );

    server.registerTool(
        "delete_tag",
        {
            description:
                "Delete a tag. By default fails (HTTP 422) with a structured `dependents` payload if the tag is in use by transactions or rules. Set force=true to delete and disassociate from those records.",
            inputSchema: {
                tagId: z.coerce.number().describe("Id of the tag to delete."),
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
        async ({ tagId, force }) => {
            try {
                const path = force
                    ? `/tags/${tagId}?force=true`
                    : `/tags/${tagId}`;
                const response = await api.delete(path);

                if (response.status === 204) {
                    return successResponse("Tag deleted.");
                }

                if (!response.ok) {
                    if (response.status === 422) {
                        return dataResponse(await response.json());
                    }
                    return handleApiError(response, "Failed to delete tag");
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to delete tag");
            }
        },
    );
}
