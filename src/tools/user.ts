import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { api, dataResponse, handleApiError, catchError } from "../api.js";
import { User } from "../types.js";

export function registerUserTools(server: McpServer) {
    server.registerTool(
        "get_user",
        {
            description: "Get details on the current user",
            annotations: {
                readOnlyHint: true,
            },
        },
        async () => {
            try {
                const response = await api.get("/me");

                if (!response.ok) {
                    return handleApiError(response, "Failed to get user");
                }

                const user: User = await response.json();

                return dataResponse(user);
            } catch (error) {
                return catchError(error, "Failed to get user");
            }
        },
    );
}
