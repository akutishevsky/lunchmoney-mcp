import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "../build/server.js";
import { initializeConfig } from "../build/config.js";

/**
 * GET /cryptocurrencies takes no filter parameters and returns well over a
 * thousand entries, so get_supported_cryptocurrencies filters client-side
 * when given `search`. `fetch` is stubbed with a small fixture list, so
 * nothing reaches the network.
 */
describe("get_supported_cryptocurrencies — search", () => {
    const FIXTURE = [
        { id: 1, coingecko_id: "bitcoin", symbol: "btc", full_name: "Bitcoin" },
        { id: 5, coingecko_id: "ethereum", symbol: "eth", full_name: "Ether" },
        {
            id: 310,
            coingecko_id: "seth",
            symbol: "seth",
            full_name: "sETH",
        },
        {
            id: 154,
            coingecko_id: "ethereum-classic",
            symbol: "etc",
            full_name: "Ethereum Classic",
        },
        {
            id: 17,
            coingecko_id: "cardano",
            symbol: "ada",
            full_name: "Cardano",
        },
    ];

    let client;
    let realFetch;

    before(async () => {
        initializeConfig("TEST-TOKEN-NOT-USED");
        realFetch = globalThis.fetch;
        globalThis.fetch = async () =>
            new Response(JSON.stringify({ cryptocurrencies: FIXTURE }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });

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

    const call = async (args) => {
        const result = await client.callTool({
            name: "get_supported_cryptocurrencies",
            arguments: args,
        });
        assert.notEqual(result.isError, true, JSON.stringify(result.content));
        return result.content[0].text;
    };

    it("returns the full list without search", async () => {
        const text = await call({});
        assert.match(text, /cryptocurrencies\[5\]/);
    });

    it("matches symbol, name, and CoinGecko id case-insensitively", async () => {
        const text = await call({ search: "ETH" });
        // eth (symbol), seth (symbol), etc (coingecko_id "ethereum-classic")
        assert.match(text, /cryptocurrencies\[3\]/);
        assert.doesNotMatch(text, /bitcoin|cardano/);
    });

    it("lists the exact symbol match first", async () => {
        const text = await call({ search: "eth" });
        const rows = text.split("\n").slice(1);
        assert.match(rows[0], /^\s*5,ethereum,eth,/);
    });

    it("says so when nothing matches", async () => {
        assert.equal(await call({ search: "nope" }), "No results.");
    });
});
