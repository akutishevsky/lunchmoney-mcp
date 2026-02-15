import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api, dataResponse, handleApiError, catchError } from "../api.js";
import { Tag } from "../types.js";

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

                const tags: Tag[] = await response.json();

                return dataResponse(tags);
            } catch (error) {
                return catchError(error, "Failed to get tags");
            }
        },
    );
}
