import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { formatData } from "../format.js";
import { Tag } from "../types.js";

export function registerTagTools(server: McpServer) {
    server.tool(
        "get_all_tags",
        "Get a list of all tags associated with the user's account.",
        {},
        async () => {
            try {
                const { baseUrl, lunchmoneyApiToken } = getConfig();
                const response = await fetch(`${baseUrl}/tags`, {
                    headers: {
                        Authorization: `Bearer ${lunchmoneyApiToken}`,
                    },
                });

                if (!response.ok) {
                    return errorResponse(
                        await getErrorMessage(
                            response,
                            "Failed to get all tags",
                        ),
                    );
                }

                const tags: Tag[] = await response.json();

                return {
                    content: [
                        {
                            type: "text",
                            text: formatData(tags),
                        },
                    ],
                };
            } catch (error) {
                return catchError(error, "Failed to get all tags");
            }
        },
    );
}
