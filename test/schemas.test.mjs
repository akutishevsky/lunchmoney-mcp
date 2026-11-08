import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    currency,
    locale,
    amount,
    cryptoBalance,
    id,
    isoDate,
    weekStartsOn,
} from "../build/schemas.js";

/**
 * Direct coverage of the shared validators in src/schemas.ts. Every tool that
 * takes a currency, amount, or ID goes through these, so the boundaries pinned
 * here are the boundaries the MCP enforces before any request is sent.
 */
describe("shared validators (src/schemas.ts)", () => {
    describe("currency", () => {
        it("accepts an uppercase code and lowercases it", () => {
            assert.equal(currency.parse("USD"), "usd");
        });

        it("accepts a lowercase code unchanged", () => {
            assert.equal(currency.parse("eur"), "eur");
        });

        it("accepts the spec's crypto codes", () => {
            assert.equal(currency.parse("BTC"), "btc");
        });

        it("rejects a three-letter code outside the spec enum", () => {
            assert.equal(currency.safeParse("XYZ").success, false);
        });

        it("rejects non-string input", () => {
            assert.equal(currency.safeParse(840).success, false);
            assert.equal(currency.safeParse(null).success, false);
        });
    });

    describe("locale", () => {
        it("accepts a spec locale", () => {
            assert.equal(locale.parse("en-US"), "en-US");
        });

        it("rejects an underscore form", () => {
            assert.equal(locale.safeParse("en_US").success, false);
        });
    });

    describe("weekStartsOn", () => {
        it("accepts sunday and monday", () => {
            assert.equal(weekStartsOn.parse("monday"), "monday");
            assert.equal(weekStartsOn.safeParse("sunday").success, true);
        });

        it("rejects other days", () => {
            assert.equal(weekStartsOn.safeParse("tuesday").success, false);
        });
    });

    describe("amount", () => {
        it("forwards numbers and strings untouched", () => {
            assert.equal(amount.parse(12.5), 12.5);
            assert.equal(amount.parse("-3"), "-3");
            assert.equal(amount.parse("12.3456"), "12.3456");
        });

        it("rejects strings with more than 4 decimal places", () => {
            assert.equal(amount.safeParse("1.23456").success, false);
        });

        it("rejects null and empty string instead of coercing them to 0", () => {
            assert.equal(amount.safeParse(null).success, false);
            assert.equal(amount.safeParse("").success, false);
        });

        it("rejects non-finite numbers", () => {
            assert.equal(amount.safeParse(Infinity).success, false);
            assert.equal(amount.safeParse(NaN).success, false);
        });
    });

    describe("cryptoBalance", () => {
        it("accepts 18 decimal places", () => {
            assert.equal(
                cryptoBalance.parse("0.000000000000000001"),
                "0.000000000000000001",
            );
        });

        it("rejects 19 decimal places", () => {
            assert.equal(
                cryptoBalance.safeParse("0.0000000000000000001").success,
                false,
            );
        });

        it("forwards a small JS number as a number, not exponent text", () => {
            assert.equal(cryptoBalance.parse(1e-8), 1e-8);
        });
    });

    describe("id", () => {
        it("coerces a numeric string to a number", () => {
            assert.equal(id.parse("42"), 42);
        });

        it("accepts the int32 maximum", () => {
            assert.equal(id.parse(2147483647), 2147483647);
        });

        it("accepts zero and negatives, as the spec's int32 format does", () => {
            assert.equal(id.parse(0), 0);
            assert.equal(id.parse(-1), -1);
        });

        it("accepts the int32 minimum and rejects values below it", () => {
            assert.equal(id.parse(-2147483648), -2147483648);
            assert.equal(id.safeParse(-2147483649).success, false);
        });

        it("rejects fractions", () => {
            assert.equal(id.safeParse(1.5).success, false);
            assert.equal(id.safeParse("1.5").success, false);
        });

        it("rejects values above int32", () => {
            assert.equal(id.safeParse(2147483648).success, false);
        });
    });

    describe("isoDate", () => {
        it("accepts YYYY-MM-DD", () => {
            assert.equal(isoDate.parse("2026-02-28"), "2026-02-28");
        });

        it("rejects unpadded or slash-separated dates", () => {
            assert.equal(isoDate.safeParse("2026-2-1").success, false);
            assert.equal(isoDate.safeParse("2026/02/01").success, false);
        });
    });
});
