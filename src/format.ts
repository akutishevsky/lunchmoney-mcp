import { encode } from "@toon-format/toon";

function stripNulls(value: unknown): unknown {
    if (value === null) return undefined;
    if (Array.isArray(value)) return value.map(stripNulls);
    if (typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (v !== null) result[k] = stripNulls(v);
        }
        return result;
    }
    return value;
}

export function formatData(data: unknown): string {
    return encode(stripNulls(data));
}
