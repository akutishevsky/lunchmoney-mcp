import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "../config.js";
import { getErrorMessage, errorResponse, catchError } from "../errors.js";
import { formatData } from "../format.js";
import { User } from "../types.js";

export function registerUserTools(server: McpServer) {
    server.tool("get_user", "Get details on the current user", {}, async () => {
        try {
            const { baseUrl, lunchmoneyApiToken } = getConfig();
            const response = await fetch(`${baseUrl}/me`, {
                headers: {
                    Authorization: `Bearer ${lunchmoneyApiToken}`,
                },
            });

            if (!response.ok) {
                return errorResponse(
                    await getErrorMessage(
                        response,
                        "Failed to get user details",
                    ),
                );
            }

            const user: User = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: formatData(user),
                    },
                ],
            };
        } catch (error) {
            return catchError(error, "Failed to get user details");
        }
    });
}
