import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "../config.js";
import { User } from "../types.js";

export function registerUserTools(server: McpServer) {
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

        const user: User = await response.json();
        
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(user),
                },
            ],
        };
    });
}