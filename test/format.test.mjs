import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatData } from "../build/format.js";

describe("formatData", () => {
    // compact() drops empty arrays, which used to leave the tool result blank.
    it("says so when a response has nothing left to show", () => {
        assert.equal(formatData({ recurring_items: [] }), "No results.");
    });

    it("still encodes non-empty data", () => {
        assert.match(formatData({ id: 1 }), /id: 1/);
    });
});
