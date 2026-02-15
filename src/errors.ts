export async function getErrorMessage(
    response: Response,
    fallbackMessage: string,
): Promise<string> {
    try {
        const body = await response.text();
        try {
            const json = JSON.parse(body);
            const detail = json.error ?? json.message ?? json.name;
            if (detail) {
                const message = Array.isArray(detail)
                    ? detail.join("; ")
                    : String(detail);
                return `${fallbackMessage} (${response.status}): ${message}`;
            }
        } catch {
            if (body) {
                return `${fallbackMessage} (${response.status}): ${body}`;
            }
        }
    } catch {
        // Failed to read body, fall through
    }
    return `${fallbackMessage} (${response.status}): ${response.statusText}`;
}

export function errorResponse(text: string) {
    return {
        isError: true as const,
        content: [{ type: "text" as const, text }],
    };
}

export function catchError(error: unknown, context: string) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(`${context}: ${message}`);
}
