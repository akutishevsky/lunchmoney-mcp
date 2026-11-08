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
import { id } from "../schemas.js";

// The v2 API returns HTTP 500 if a color value includes a leading `#`.
// Strip it so callers can pass either `#cccccc` or `cccccc` interchangeably.
function normalizeColor(
    value: string | null | undefined,
): string | null | undefined {
    if (value === undefined || value === null) return value;
    return value.startsWith("#") ? value.slice(1) : value;
}

// ISO 8601 extended datetime with an optional UTC offset, e.g.
// 2026-01-15T10:00:00Z or 2026-01-15T10:00:00.000+02:00.
const isoDateTime = z.string().datetime({
    offset: true,
    message: "Must be an ISO 8601 extended datetime.",
});

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
                tagId: id.describe(
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
                    .describe(
                        "Name of the tag. 1-100 characters. Must not match the name of an existing tag.",
                    ),
                description: z
                    .string()
                    .max(200)
                    .nullable()
                    .optional()
                    .describe(
                        "Optional description. Up to 200 characters. Pass null to leave it empty.",
                    ),
                text_color: z
                    .string()
                    .nullable()
                    .optional()
                    .describe(
                        "Optional text color of the tag. Pass null to leave it unset.",
                    ),
                background_color: z
                    .string()
                    .nullable()
                    .optional()
                    .describe(
                        "Optional background color of the tag. Pass null to leave it unset.",
                    ),
                archived: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, the tag is archived and not displayed in relevant areas of the Lunch Money app. Defaults to false.",
                    ),
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
                    requestBody.text_color = normalizeColor(text_color);
                if (background_color !== undefined)
                    requestBody.background_color =
                        normalizeColor(background_color);
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
            description:
                "Update properties for an existing tag. Only the fields provided are changed; at least one field must be provided.",
            inputSchema: {
                tagId: id.describe("Id of the tag to update."),
                name: z
                    .string()
                    .min(1)
                    .max(100)
                    .optional()
                    .describe("New name of the tag. 1-100 characters."),
                description: z
                    .string()
                    .max(200)
                    .nullable()
                    .optional()
                    .describe(
                        "New description of the tag. Up to 200 characters. Pass null to clear it.",
                    ),
                text_color: z
                    .string()
                    .nullable()
                    .optional()
                    .describe(
                        "New text color of the tag. Pass null to clear it.",
                    ),
                background_color: z
                    .string()
                    .nullable()
                    .optional()
                    .describe(
                        "New background color of the tag. Pass null to clear it.",
                    ),
                archived: z
                    .boolean()
                    .optional()
                    .describe(
                        "If set, determines whether this tag is archived. Archived tags are not displayed in relevant areas of the Lunch Money app.",
                    ),
                archived_at: isoDateTime
                    .nullable()
                    .optional()
                    .describe(
                        "Archived timestamp for the tag, as an ISO 8601 extended datetime (e.g. 2026-01-15T10:00:00Z). Pass null to clear it.",
                    ),
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
            archived_at,
        }) => {
            try {
                const requestBody: Record<string, unknown> = {};
                if (name !== undefined) requestBody.name = name;
                if (description !== undefined)
                    requestBody.description = description;
                if (text_color !== undefined)
                    requestBody.text_color = normalizeColor(text_color);
                if (background_color !== undefined)
                    requestBody.background_color =
                        normalizeColor(background_color);
                if (archived !== undefined) requestBody.archived = archived;
                if (archived_at !== undefined)
                    requestBody.archived_at = archived_at;

                if (Object.keys(requestBody).length === 0) {
                    return errorResponse(
                        "No fields to update. Provide at least one of: name, description, text_color, background_color, archived, archived_at.",
                    );
                }

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
                "Delete a tag. By default the deletion is refused if the tag is in use by transactions or rules: the result is an error containing a `dependents` payload listing the rules and transactions that still reference the tag. Set force=true to delete the tag and disassociate it from those records (irreversible).",
            inputSchema: {
                tagId: id.describe("Id of the tag to delete."),
                force: z
                    .boolean()
                    .optional()
                    .describe(
                        "If true, force deletion even if dependencies exist (irreversible). Defaults to false.",
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

                // 422 means the tag was not deleted because transactions or
                // rules still reference it. Surface it as an error with the
                // dependents payload so the model can decide whether to force.
                if (response.status === 422) {
                    const body = await response.text();
                    let payload: unknown = body;
                    try {
                        payload = JSON.parse(body);
                    } catch {
                        // Not JSON; keep the raw text.
                    }
                    return errorResponse(
                        `Tag not deleted because it is still in use (422). Set force=true to delete it and disassociate it from these records.\n${formatData(payload)}`,
                    );
                }

                if (!response.ok) {
                    return handleApiError(response, "Failed to delete tag");
                }

                return dataResponse(await response.json());
            } catch (error) {
                return catchError(error, "Failed to delete tag");
            }
        },
    );
}
