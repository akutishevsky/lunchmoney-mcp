import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../build/server.js";
import { initializeConfig } from "../build/config.js";

/**
 * Spec constraints enforced client-side (paired date and month ranges, mutual
 * exclusions, min-one-field PUT bodies). Each call here is rejected before any
 * request leaves the process, which is the property being asserted, so these
 * run without a network connection.
 */
describe("spec constraints — rejected before any request", () => {
    let client;

    before(async () => {
        initializeConfig("TEST-TOKEN-NOT-USED");
        const server = createServer("test");
        const [clientTransport, serverTransport] =
            InMemoryTransport.createLinkedPair();
        client = new Client({ name: "test", version: "0" });
        await Promise.all([
            client.connect(clientTransport),
            server.connect(serverTransport),
        ]);
    });

    after(async () => {
        await client.close();
    });

    // Schema-layer failures can surface as a thrown protocol error rather than
    // an isError result, so both shapes are folded into one.
    const call = (name, args) =>
        client.callTool({ name, arguments: args }).catch((error) => ({
            isError: true,
            content: [{ type: "text", text: String(error.message) }],
        }));

    const assertRejected = (result, pattern) => {
        assert.equal(result.isError, true, "call should be rejected");
        assert.match(result.content[0].text, pattern);
    };

    it("get_recurring_items rejects a lone start_date", async () => {
        assertRejected(
            await call("get_recurring_items", { start_date: "2026-01-01" }),
            /start_date and end_date must be provided together/,
        );
    });

    it("trigger_plaid_fetch rejects a lone end_date", async () => {
        assertRejected(
            await call("trigger_plaid_fetch", { end_date: "2026-01-31" }),
            /start_date and end_date must be provided together/,
        );
    });

    it("get_balance_history rejects start_month without end_month", async () => {
        assertRejected(
            await call("get_balance_history", { start_month: "2026-01" }),
            /must either both be provided or both be omitted/,
        );
    });

    it("get_balance_history rejects end_month earlier than start_month", async () => {
        assertRejected(
            await call("get_balance_history", {
                start_month: "2026-03",
                end_month: "2026-01",
            }),
            /must not be earlier than start_month/,
        );
    });

    it("update_account_settings rejects an empty body", async () => {
        assertRejected(
            await call("update_account_settings", {}),
            /at least one property must be provided/,
        );
    });

    it("update_user_settings rejects an empty body", async () => {
        assertRejected(
            await call("update_user_settings", {}),
            /at least one property must be provided/,
        );
    });

    it("update_user_account_settings rejects an empty body", async () => {
        assertRejected(
            await call("update_user_account_settings", {}),
            /at least one property must be provided/,
        );
    });

    it("update_tag rejects a call with only the id", async () => {
        assertRejected(
            await call("update_tag", { tagId: 1 }),
            /No fields to update/,
        );
    });

    // The spec allows {} here, but the live API answers 400.
    it("update_manual_crypto rejects a call with only the id", async () => {
        assertRejected(
            await call("update_manual_crypto", { crypto_id: 1 }),
            /at least one property/,
        );
    });

    it("create_manual_account rejects closed_on unless status is closed", async () => {
        assertRejected(
            await call("create_manual_account", {
                name: "Test account",
                type: "cash",
                balance: 10,
                currency: "usd",
                closed_on: "2026-01-01",
            }),
            /closed_on requires status to be "closed"/,
        );
    });

    it("update_manual_account rejects closed_on combined with status active", async () => {
        assertRejected(
            await call("update_manual_account", {
                accountId: 1,
                status: "active",
                closed_on: "2026-01-01",
            }),
            /closed_on cannot be set with status "active"/,
        );
    });

    it("create_transactions rejects manual_account_id and plaid_account_id together", async () => {
        assertRejected(
            await call("create_transactions", {
                transactions: [
                    {
                        date: "2026-01-01",
                        amount: 5,
                        manual_account_id: 1,
                        plaid_account_id: 2,
                    },
                ],
            }),
            /cannot both be non-null/,
        );
    });

    it("create_transactions rejects a null amount instead of coercing it to 0", async () => {
        const result = await call("create_transactions", {
            transactions: [{ date: "2026-01-01", amount: null }],
        });
        assert.equal(result.isError, true);
    });

    // The spec sets no maxLength on transaction notes, but the live API
    // rejects notes of 350+ characters (verified against a demo account).
    it("create_transactions rejects notes over 350 characters", async () => {
        const result = await call("create_transactions", {
            transactions: [
                { date: "2026-01-01", amount: 1, notes: "a".repeat(351) },
            ],
        });
        assertRejected(result, /notes/);
    });

    it("rejects an unknown currency without listing every code", async () => {
        const result = await call("create_transactions", {
            transactions: [{ date: "2026-01-01", amount: 1, currency: "xyz" }],
        });
        assertRejected(result, /Invalid currency/);
        assert.doesNotMatch(result.content[0].text, /"zwl"/);
    });
});
