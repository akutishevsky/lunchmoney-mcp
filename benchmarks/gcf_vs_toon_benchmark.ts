/**
 * GCF vs TOON vs JSON benchmark for LunchMoney MCP data shapes.
 *
 * Generates realistic LunchMoney data (transactions, budgets, categories,
 * accounts) at various row counts and compares token usage across JSON,
 * TOON, and GCF (Graph Compact Format) encodings.
 */

import { encodeGeneric } from "@blackwell-systems/gcf";
import { encode as toonEncode } from "@toon-format/toon";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Token estimation (same heuristic used across GCF benchmarks)
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
    return Math.max(1, Math.floor(text.length / 4));
}

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

const CATEGORIES = [
    "Groceries",
    "Dining",
    "Transportation",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Shopping",
    "Subscriptions",
    "Travel",
    "Education",
];
const PAYEES = [
    "Whole Foods",
    "Trader Joe's",
    "Uber",
    "Spotify",
    "Netflix",
    "Amazon",
    "Target",
    "Costco",
    "Starbucks",
    "CVS Pharmacy",
    "Shell Gas",
    "Delta Airlines",
    "Airbnb",
    "Comcast",
    "AT&T",
];
const STATUSES = ["cleared", "uncleared", "pending"];
const CURRENCIES = ["usd", "eur", "gbp", "cad"];
const ACCOUNT_TYPES = [
    "checking",
    "savings",
    "credit_card",
    "investment",
    "cash",
];
const INSTITUTIONS = [
    "Chase",
    "Bank of America",
    "Wells Fargo",
    "Citi",
    "Capital One",
    "Fidelity",
    "Schwab",
    "Vanguard",
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(year: number, month: number): string {
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function generateTransactions(n: number): Record<string, unknown>[] {
    return Array.from({ length: n }, (_, i) => ({
        id: 100000 + i,
        date: randomDate(2026, Math.floor(Math.random() * 6) + 1),
        amount: +(Math.random() * 500 - 50).toFixed(2),
        category: pick(CATEGORIES),
        payee: pick(PAYEES),
        notes:
            Math.random() > 0.6
                ? `Payment for ${pick(CATEGORIES).toLowerCase()} item`
                : null,
        status: pick(STATUSES),
        currency: pick(CURRENCIES),
        account_id: Math.floor(Math.random() * 8) + 1,
        tag_ids:
            Math.random() > 0.5
                ? Array.from(
                      { length: Math.floor(Math.random() * 3) + 1 },
                      () => Math.floor(Math.random() * 20) + 1,
                  )
                : [],
        is_pending: Math.random() > 0.8,
    }));
}

function generateBudgets(n: number): Record<string, unknown>[] {
    return Array.from({ length: n }, (_, i) => ({
        category_id: i + 1,
        category_name: CATEGORIES[i % CATEGORIES.length],
        budgeted: +(Math.random() * 1000 + 100).toFixed(2),
        spent: +(Math.random() * 800).toFixed(2),
        remaining: +(Math.random() * 500).toFixed(2),
        month: `2026-${String((i % 12) + 1).padStart(2, "0")}`,
        is_automated: Math.random() > 0.7,
        rollover: Math.random() > 0.5,
    }));
}

function generateCategories(n: number): Record<string, unknown>[] {
    return Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        name: i < CATEGORIES.length ? CATEGORIES[i] : `Category ${i + 1}`,
        group_name:
            i % 3 === 0
                ? "Essentials"
                : i % 3 === 1
                  ? "Lifestyle"
                  : "Financial",
        is_income: Math.random() > 0.85,
        exclude_from_budget: Math.random() > 0.9,
        created_at: `2025-${String((i % 12) + 1).padStart(2, "0")}-15T10:00:00.000Z`,
        updated_at: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
        is_group: false,
        group_id:
            Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : null,
    }));
}

function generateAccounts(n: number): Record<string, unknown>[] {
    return Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        name: `${pick(INSTITUTIONS)} ${pick(ACCOUNT_TYPES).replace("_", " ")}`,
        type: pick(ACCOUNT_TYPES),
        balance: +(Math.random() * 50000 - 5000).toFixed(2),
        currency: pick(CURRENCIES),
        institution: pick(INSTITUTIONS),
        created_at: `2024-${String((i % 12) + 1).padStart(2, "0")}-01T00:00:00.000Z`,
        is_closed: Math.random() > 0.9,
    }));
}

// ---------------------------------------------------------------------------
// Compact helper (mirrors src/format.ts)
// ---------------------------------------------------------------------------

function isBlank(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    return Array.isArray(value) && value.length === 0;
}

function isPrimitiveArray(arr: unknown[]): boolean {
    return arr.every((el) => el === null || typeof el !== "object");
}

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

// ---------------------------------------------------------------------------
// Benchmark runner
// ---------------------------------------------------------------------------

interface BenchmarkResult {
    dataType: string;
    rows: number;
    jsonTokens: number;
    toonTokens: number;
    gcfTokens: number;
    gcfVsJson: string;
    gcfVsToon: string;
}

function benchmark(
    label: string,
    data: Record<string, unknown>[],
): BenchmarkResult {
    const compacted = compact(data);

    const jsonStr = JSON.stringify(data);
    const toonStr = toonEncode(compacted);
    const gcfStr = encodeGeneric(compacted);

    const jsonTokens = estimateTokens(jsonStr);
    const toonTokens = estimateTokens(toonStr);
    const gcfTokens = estimateTokens(gcfStr);

    const gcfVsJson = (((jsonTokens - gcfTokens) / jsonTokens) * 100).toFixed(
        1,
    );
    const gcfVsToon = (((toonTokens - gcfTokens) / toonTokens) * 100).toFixed(
        1,
    );

    return {
        dataType: label,
        rows: data.length,
        jsonTokens,
        toonTokens,
        gcfTokens,
        gcfVsJson: `${gcfVsJson}%`,
        gcfVsToon: `${gcfVsToon}%`,
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ROW_COUNTS = [10, 50, 100, 200];

const generators: [string, (n: number) => Record<string, unknown>[]][] = [
    ["Transactions", generateTransactions],
    ["Budgets", generateBudgets],
    ["Categories", generateCategories],
    ["Accounts", generateAccounts],
];

const results: BenchmarkResult[] = [];

for (const [label, gen] of generators) {
    for (const n of ROW_COUNTS) {
        results.push(benchmark(label, gen(n)));
    }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const header = [
    "Data Type",
    "Rows",
    "JSON Tokens",
    "TOON Tokens",
    "GCF Tokens",
    "GCF vs JSON",
    "GCF vs TOON",
];

const colWidths = header.map((h, i) => {
    const vals = results.map((r) => String(Object.values(r)[i]));
    return Math.max(h.length, ...vals.map((v) => v.length));
});

function padRow(cells: string[]): string {
    return (
        "| " + cells.map((c, i) => c.padEnd(colWidths[i])).join(" | ") + " |"
    );
}

const lines: string[] = [];
lines.push("GCF vs TOON vs JSON Benchmark: LunchMoney MCP Data Shapes");
lines.push("=".repeat(60));
lines.push("");
lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
lines.push("Token estimation: Math.max(1, Math.floor(text.length / 4))");
lines.push(
    "Data: realistic LunchMoney financial records with compaction applied",
);
lines.push("");
lines.push(padRow(header));
lines.push("| " + colWidths.map((w) => "-".repeat(w)).join(" | ") + " |");

for (const r of results) {
    lines.push(padRow(Object.values(r).map(String)));
}

// Summary
const jsonTotal = results.reduce((s, r) => s + r.jsonTokens, 0);
const toonTotal = results.reduce((s, r) => s + r.toonTokens, 0);
const gcfTotal = results.reduce((s, r) => s + r.gcfTokens, 0);

lines.push("");
lines.push("Summary");
lines.push("-".repeat(40));
lines.push(`Total JSON tokens:  ${jsonTotal.toLocaleString()}`);
lines.push(`Total TOON tokens:  ${toonTotal.toLocaleString()}`);
lines.push(`Total GCF tokens:   ${gcfTotal.toLocaleString()}`);
lines.push(
    `GCF vs JSON saving: ${(((jsonTotal - gcfTotal) / jsonTotal) * 100).toFixed(1)}%`,
);
lines.push(
    `GCF vs TOON saving: ${(((toonTotal - gcfTotal) / toonTotal) * 100).toFixed(1)}%`,
);

const output = lines.join("\n") + "\n";

console.log(output);

const outPath = join(__dirname, "results-2026-06-17.txt");
writeFileSync(outPath, output, "utf-8");
console.log(`Results written to ${outPath}`);
