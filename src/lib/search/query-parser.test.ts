import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContextQuery } from "./query-parser";

test("parses price, billing period, and use-case context", () => {
  const parsed = parseContextQuery(
    "saas product under $20 per month for hospital management",
  );
  assert.equal(parsed.maxPrice, 20);
  assert.equal(parsed.billingPeriod, "month");
  assert.ok(parsed.useCaseTerms.includes("hospital"));
  assert.ok(parsed.useCaseTerms.includes("management"));
});

test("parses INR under rupees per unit", () => {
  const parsed = parseContextQuery("glass bottles under ₹10 per unit for pharma");
  assert.equal(parsed.maxPrice, 10);
});

test("parses INR rs below pattern", () => {
  const parsed = parseContextQuery("crates below rs 50 for export");
  assert.equal(parsed.maxPrice, 50);
});
