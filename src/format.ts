import { encode } from "@toon-format/toon";

function isBlank(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    return Array.isArray(value) && value.length === 0;
}

function isPrimitiveArray(arr: unknown[]): boolean {
    return arr.every((el) => el === null || typeof el !== "object");
}

// For an array of objects, drop a key only when it is blank in EVERY row, and
// keep partially-present keys as explicit nulls. Uniform keys across rows let
// TOON emit its compact tabular form (header once, rows as CSV) instead of a
// verbose repeated-key list. Primitive-array values are joined to a single
// scalar by compact() so they don't disqualify a row from the tabular form.
function compactArray(arr: unknown[]): unknown[] {
    const allObjects =
        arr.length > 0 &&
        arr.every(
            (el) => el !== null && typeof el === "object" && !Array.isArray(el),
        );
    if (!allObjects) return arr.map(compact);

    const rows = arr as Record<string, unknown>[];
    const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const kept = keys.filter((k) => rows.some((row) => !isBlank(row[k])));

    return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const k of kept) {
            out[k] = isBlank(row[k]) ? null : compact(row[k]);
        }
        return out;
    });
}

function compact(value: unknown): unknown {
    if (Array.isArray(value)) {
        if (isPrimitiveArray(value)) return value.join("|");
        return compactArray(value);
    }
    if (value === null || typeof value !== "object") return value;

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
        if (!isBlank(v)) out[k] = compact(v);
    }
    return out;
}

export function formatData(data: unknown): string {
    return encode(compact(data));
}
