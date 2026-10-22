import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSupplierRecipients } from "./supplier-recipient-config";

const mapping = { S1: "one@example.test", S2: "two@example.test", S3: "three@example.test" };

test("accepts a supplier-ID mapping and an encoded mapping", () => {
  for (const raw of [JSON.stringify(mapping), JSON.stringify(JSON.stringify(mapping))]) {
    assert.deepEqual(parseSupplierRecipients(raw).recipients, mapping);
  }
});
test("accepts the uploaded supplier array, including a suppliers wrapper", () => {
  const rows = Object.entries(mapping).map(([supplier_id, email]) => ({ supplier_id, name: "Supplier", email }));
  for (const input of [rows, { suppliers: rows }]) {
    assert.deepEqual(parseSupplierRecipients(JSON.stringify(input)).recipients, mapping);
  }
});
test("rejects malformed, incomplete, duplicate, and invalid-address configurations", () => {
  assert.equal(parseSupplierRecipients(undefined).status, "missing");
  assert.equal(parseSupplierRecipients("not JSON").status, "invalid_json");
  assert.equal(parseSupplierRecipients("123").status, "invalid_shape");
  assert.equal(parseSupplierRecipients(JSON.stringify({ S1: mapping.S1 })).recipients, null);
  assert.equal(parseSupplierRecipients(JSON.stringify({ ...mapping, S2: "bad address" })).recipients, null);
  assert.equal(parseSupplierRecipients(JSON.stringify([
    { supplier_id: "S1", email: mapping.S1 }, { supplier_id: "S1", email: mapping.S1 },
  ])).status, "duplicate_supplier");
});
