import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTierMatch,
  passesMaxUnitPrice,
  validateTierRanges,
} from "./match-suppliers";

test("computeTierMatch uses MOQ when quantity omitted", () => {
  const m = computeTierMatch(undefined, 100, [
    { minQty: 100, maxQty: 1000, unitPrice: 10 },
    { minQty: 1001, maxQty: null, unitPrice: 8 },
  ]);
  assert.equal(m.effectiveQuantity, 100);
  assert.equal(m.unitPrice, 10);
  assert.equal(m.belowMoq, false);
});

test("computeTierMatch flags below MOQ and prices at MOQ tier", () => {
  const m = computeTierMatch(50, 100, [{ minQty: 100, maxQty: null, unitPrice: 10 }]);
  assert.equal(m.belowMoq, true);
  assert.equal(m.effectiveQuantity, 100);
  assert.equal(m.unitPrice, 10);
});

test("computeTierMatch exposes leadTimeDays when tier has it", () => {
  const m = computeTierMatch(500, 1, [
    { minQty: 1, maxQty: 1000, unitPrice: 9.5, leadTimeDays: 5 },
    { minQty: 1001, maxQty: null, unitPrice: 8, leadTimeDays: 20 },
  ]);
  assert.equal(m.leadTimeDays, 5);
});

test("passesMaxUnitPrice", () => {
  assert.equal(passesMaxUnitPrice(undefined, 100), true);
  assert.equal(passesMaxUnitPrice(10, 9), true);
  assert.equal(passesMaxUnitPrice(10, 11), false);
});

test("validateTierRanges rejects overlap", () => {
  const r = validateTierRanges([
    { minQty: 1, maxQty: 1000, unitPrice: 12 },
    { minQty: 500, maxQty: null, unitPrice: 10 },
  ]);
  assert.equal(r.ok, false);
});

test("validateTierRanges accepts valid ladder", () => {
  const r = validateTierRanges([
    { minQty: 1, maxQty: 1000, unitPrice: 12 },
    { minQty: 1001, maxQty: null, unitPrice: 10 },
  ]);
  assert.equal(r.ok, true);
});
