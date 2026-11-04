import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../build/server.js";
import { initializeConfig } from "../build/config.js";

/**
 * `custom_metadata` is the only `z.record` in the tool schemas, and the record
 * signature is the one place where zod 3 and zod 4 differ: zod 4 dropped the
 * single-argument `z.record(value)` form. These pin that the field still
 * advertises an object schema, still accepts an arbitrary object, and still
 * rejects a non-object — whatever zod major is installed.
 *
 * `fetch` is stubbed, so nothing reaches the network; the stub records the
 * request body so the accepted case can assert what would have been sent.
 */
describe("custom_metadata — record schema", () => {
    let client;
    let realFetch;
    let sent;

    before(async () => {
        initializeConfig("TEST-TOKEN-NOT-USED");
        realFetch = globalThis.fetch;
        globalThis.fetch = async (_url, options) => {
            sent =
                options.body === undefined
                    ? undefined
                    : JSON.parse(options.body);
            return new Response(JSON.stringify({ id: 1 }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        };

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
        globalThis.fetch = realFetch;
        await client.close();
    });

    const updateTransaction = (customMetadata) => {
        sent = undefined;
        return client.callTool({
            name: "update_transaction",
            arguments: {
                transaction_id: 1,
                update: { custom_metadata: customMetadata },
            },
        });
    };

    it("advertises custom_metadata as an object in both transaction schemas", async () => {
        const { tools } = await client.listTools();
        for (const name of ["create_transactions", "update_transaction"]) {
            const tool = tools.find((t) => t.name === name);
            assert.ok(tool, `${name} should be registered`);
            const schema = JSON.stringify(tool.inputSchema);
            assert.match(
                schema,
                /"custom_metadata":\{"anyOf":\[\{"type":"object"/,
                `${name} should advertise custom_metadata as an object`,
            );
        }
    });

    it("accepts an arbitrary object and forwards it unchanged", async () => {
        const metadata = { source: "import", batch: 7, nested: { ok: true } };
        const result = await updateTransaction(metadata);

        assert.notEqual(result.isError, true, JSON.stringify(result.content));
        assert.deepEqual(sent?.custom_metadata, metadata);
    });

    it("accepts null to clear the metadata", async () => {
        const result = await updateTransaction(null);

        assert.notEqual(result.isError, true, JSON.stringify(result.content));
        assert.equal(sent?.custom_metadata, null);
    });

    it("rejects a string before any request is made", async () => {
        const result = await updateTransaction("not-an-object");

        assert.equal(result.isError, true);
        assert.match(result.content[0].text, /custom_metadata/);
        assert.equal(sent, undefined, "no request should have been sent");
    });
});
