// Fields on a v2 error object (besides errMsg) that carry useful context
// the AI caller may need to recover — surface them in error messages so
// the model can retry without an extra round-trip.
const V2_ERROR_HINT_FIELDS = [
    "requested_start_date",
    "previous_valid_start_date",
    "next_valid_start_date",
    "transaction_id",
    "transaction_index",
    "category_id",
    "tag_id",
    "manual_account_id",
    "plaid_account_id",
    "recurring_id",
    "external_id",
    "invalid_property",
    "locked_property",
    "id",
] as const;

function formatV2Error(err: Record<string, unknown>): string {
    const msg = typeof err.errMsg === "string" ? err.errMsg : "";
    const hints: string[] = [];
    for (const field of V2_ERROR_HINT_FIELDS) {
        const value = err[field];
        if (value === undefined || value === null) continue;
        hints.push(`${field}=${value}`);
    }
    if (hints.length === 0) return msg;
    return msg ? `${msg} [${hints.join(", ")}]` : `[${hints.join(", ")}]`;
}

export async function getErrorMessage(
    response: Response,
    fallbackMessage: string,
): Promise<string> {
    try {
        const body = await response.text();
        try {
            const json = JSON.parse(body);
            // v2 standard error shape: { message, errors: [{ errMsg, ... }] }
            if (Array.isArray(json.errors) && json.errors.length > 0) {
                const top =
                    typeof json.message === "string" ? json.message : "";
                const details = json.errors
                    .map((e: unknown) =>
                        e && typeof e === "object"
                            ? formatV2Error(e as Record<string, unknown>)
                            : String(e),
                    )
                    .filter((s: string) => s.length > 0)
                    .join("; ");
                const combined = top
                    ? details
                        ? `${top}: ${details}`
                        : top
                    : details;
                if (combined) {
                    return `${fallbackMessage} (${response.status}): ${combined}`;
                }
            }
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
    console.error(`${context}: ${message}`);
    return errorResponse(`${context}: ${message}`);
}
