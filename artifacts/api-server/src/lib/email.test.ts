import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import type { EmailReceipt, EmailSettings, OrderEmailInput } from "@workspace/api-zod";
import { SendOrderEmailResponse } from "@workspace/api-zod";
import inventory from "../data/mock_db.json";
import suppliers from "../data/suppliers.json";
import { EmailOutbox } from "./email-outbox";
import { approvedSuppliers, EmailError, validateOrderEmail } from "./email-policy";
import { createEmailRouter } from "../routes/email";

const item = inventory[0]!;
const supplier = suppliers.find(s => s.supplier_id === item.supplier_id)!;
const input: OrderEmailInput = {
  sendId: "test-email-draft-00001", itemId: item.id, supplierId: supplier.supplier_id,
  quantity: 2, to: supplier.email, subject: "Test order", body: "Test content; no real messages sent.",
};
const settings: EmailSettings = { ready: true, sender: "store@example.test", transport: "gmail", reason: "", approvedSupplierIds: [supplier.supplier_id] };
const receipt: EmailReceipt = { sendId: input.sendId, messageId: "mock-gmail-receipt", from: settings.sender, acceptedAt: "2026-10-22T00:00:00Z", transport: "gmail" };

test("server allowlist never authorizes an address absent from the supplied catalog", () => {
  assert.deepEqual(approvedSuppliers(JSON.stringify({ [supplier.supplier_id]: supplier.email })), [supplier.supplier_id]);
  assert.deepEqual(approvedSuppliers(JSON.stringify({ [supplier.supplier_id]: { recipients: [supplier.email] } })), [supplier.supplier_id]);
  assert.deepEqual(approvedSuppliers(JSON.stringify(["stranger@example.test"])), []);
  assert.deepEqual(approvedSuppliers("{bad json"), []);
  assert.throws(() => validateOrderEmail({ ...input, to: "stranger@example.test" }, [supplier.supplier_id]), /restricted/);
  assert.throws(() => validateOrderEmail({ ...input, subject: "Order\r\nBcc: stranger@example.test" }, [supplier.supplier_id]), /line breaks/);
});

test("accepted receipts and uncertain attempts survive closing and reopening the outbox", async t => {
  const dir = await mkdtemp(join(tmpdir(), "stocksync-outbox-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filename = join(dir, "outbox.sqlite");
  const first = new EmailOutbox(filename);
  first.reserve(input, 100000);
  first.accept(input.sendId, receipt);
  first.reserve({ ...input, sendId: "test-email-pending-0001" }, 111000);
  first.close();
  const reopened = new EmailOutbox(filename);
  t.after(() => reopened.close());
  assert.deepEqual(reopened.reserve(input, 120000), receipt);
  assert.throws(() => reopened.reserve({ ...input, sendId: "test-email-pending-0001" }, 120000), /uncertain/);
  assert.throws(() => reopened.reserve({ ...input, body: "changed" }, 120000), /already has a send attempt/);
});

test("global send limits apply across draft IDs", t => {
  const box = new EmailOutbox(":memory:");
  t.after(() => box.close());
  for (let i = 0; i < 10; i++) {
    const request = { ...input, sendId: `test-limit-draft-${i}` };
    box.reserve(request, 100000 + i * 11000);
    if (i === 0) assert.throws(() => box.reserve({ ...input, sendId: "too-soon-draft-id" }, 100001), /limit/);
  }
  assert.throws(() => box.reserve({ ...input, sendId: "over-daily-cap-id" }, 300000), /limit/);
});

async function server(t: TestContext, deliver: () => Promise<string>, ready = true) {
  const box = new EmailOutbox(":memory:");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { Object.assign(req, { log: { error() {} } }); next(); });
  app.use("/api", createEmailRouter({
    settings: async () => ({ ...settings, ready, reason: ready ? "" : "Mailbox disabled" }),
    deliver, journal: () => box, approved: () => settings.approvedSupplierIds,
  }));
  const listener = app.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const address = listener.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  t.after(() => { listener.closeAllConnections(); listener.close(); box.close(); });
  return {
    base,
    post: (body = input, origin = base) => fetch(`${base}/api/email/send`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
    }),
  };
}

test("send endpoint accepts once, then returns the saved receipt without another provider call", async t => {
  let sends = 0;
  const api = await server(t, async () => { sends++; return "mock-gmail-receipt"; });
  const first = await api.post();
  assert.equal(first.status, 200);
  const result = SendOrderEmailResponse.parse(await first.json());
  assert.equal(result.messageId, "mock-gmail-receipt");
  assert.equal(result.from, settings.sender);
  const retry = await api.post();
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), result);
  assert.equal(sends, 1);
});

test("cross-origin, recipient substitution, malformed quantity, and header injection never call Gmail", async t => {
  let sends = 0;
  const api = await server(t, async () => { sends++; return "not-used"; });
  assert.equal((await api.post(input, "https://untrusted.example")).status, 403);
  assert.equal((await api.post({ ...input, to: "stranger@example.test" })).status, 403);
  assert.equal((await api.post({ ...input, quantity: 0 })).status, 400);
  assert.equal((await api.post({ ...input, subject: "Order\nBcc: stranger@example.test" })).status, 400);
  assert.equal((await api.post({ ...input, supplierId: "unknown-supplier" })).status, 400);
  assert.equal(sends, 0);
});

test("uncertain provider responses are not blindly retried", async t => {
  let sends = 0;
  const api = await server(t, async () => { sends++; throw new Error("Simulated lost response"); });
  assert.equal((await api.post()).status, 502);
  const retry = await api.post();
  assert.equal(retry.status, 409);
  assert.equal(((await retry.json()) as { code: string }).code, "SEND_UNCERTAIN");
  assert.equal(sends, 1);
});

test("disabled mailbox and definite rejection return errors, not fake receipts", async t => {
  const disabled = await server(t, async () => { throw new Error("Must not send"); }, false);
  assert.equal((await disabled.post()).status, 503);
  const rejected = await server(t, async () => { throw new EmailError(502, "PROVIDER_REJECTED", "Gmail rejected the request"); });
  const response = await rejected.post();
  assert.equal(response.status, 502);
  assert.equal(((await response.json()) as { code: string }).code, "PROVIDER_REJECTED");
});
