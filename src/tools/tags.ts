import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "../config.js";

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