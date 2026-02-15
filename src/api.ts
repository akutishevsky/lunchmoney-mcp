import { getConfig } from "./config.js";
import { getErrorMessage, errorResponse, catchError } from "./errors.js";
import { formatData } from "./format.js";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelay(response: Response, attempt: number): number {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
        const seconds = Number(retryAfter);
        if (!isNaN(seconds)) return seconds * 1000;
    }
    return Math.min(1000 * 2 ** attempt, 10_000);
}

async function apiRequest(
    method: string,
    path: string,
    body?: unknown,
): Promise<Response> {
    const { baseUrl, lunchmoneyApiToken } = getConfig();

    const headers: Record<string, string> = {
        Authorization: `Bearer ${lunchmoneyApiToken}`,
    };
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    const options: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }

    const url = `${baseUrl}${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(url, options);

        if (
            RETRYABLE_STATUS_CODES.has(response.status) &&
            attempt < MAX_RETRIES
        ) {
            const delay = getRetryDelay(response, attempt);
            console.error(
                `Retrying ${method} ${path} (${response.status}) in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
            );
            await sleep(delay);
            continue;
        }

        return response;
    }

    // Unreachable, but satisfies TypeScript
    throw new Error(`Max retries exceeded for ${method} ${path}`);
}

export const api = {
    get: (path: string) => apiRequest("GET", path),
    post: (path: string, body?: unknown) => apiRequest("POST", path, body),
    put: (path: string, body: unknown) => apiRequest("PUT", path, body),
    delete: (path: string) => apiRequest("DELETE", path),
};

export function successResponse(text: string) {
    return {
        content: [{ type: "text" as const, text }],
    };
}

export function dataResponse(data: unknown) {
    return {
        content: [{ type: "text" as const, text: formatData(data) }],
    };
}

export async function handleApiError(
    response: Response,
    fallbackMessage: string,
) {
    return errorResponse(await getErrorMessage(response, fallbackMessage));
}

export { catchError, errorResponse };
