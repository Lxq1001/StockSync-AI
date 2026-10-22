import { Router, type Request, type Response } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { parseSupplierRecipients } from "../lib/supplier-recipient-config";
import { stockDataset } from "../lib/stock-dataset";

const router = Router();
const supplierIds = new Set(stockDataset.suppliers.map(s => s.supplier_id));
const itemSupplier: Record<string, string> = Object.fromEntries(stockDataset.inventory.map(i => [i.id, i.supplier_id]));
const supplierNames: Record<string, string> = Object.fromEntries(stockDataset.suppliers.map(s => [s.supplier_id, s.name]));
const itemNames: Record<string, string> = Object.fromEntries(stockDataset.inventory.map(i => [i.id, i.name]));
const sendTimes = new Map<string, number[]>();
const successfulSends = new Map<string, { id: string; at: number }>();

function configuredRecipients(): Record<string, string> | null {
  return parseSupplierRecipients(process.env.STOCKSYNC_SUPPLIER_RECIPIENTS_JSON).recipients;
}

function recipientConfigStatus() {
  const { recipients: _recipients, ...status } = parseSupplierRecipients(process.env.STOCKSYNC_SUPPLIER_RECIPIENTS_JSON);
  return status;
}

function sameOrigin(req: Request): boolean {
  const origin = req.get("origin");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    return originHost === (forwardedHost || req.get("host"));
  } catch {
    return false;
  }
}

function allowSend(req: Request, res: Response): boolean {
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "This send request must come from the StockSync website." });
    return false;
  }
  const key = req.ip || "unknown";
  const now = Date.now();
  const recent = (sendTimes.get(key) || []).filter(time => now - time < 60 * 60 * 1000);
  if (recent.length >= 5) {
    res.status(429).json({ error: "Email send limit reached. Try again later." });
    return false;
  }
  recent.push(now);
  sendTimes.set(key, recent);
  return true;
}

function encodeMessage(to: string, subject: string, body: string): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
  return Buffer.from(message, "utf8").toString("base64url");
}

router.get("/email/config", (_req, res) => {
  const recipients = configuredRecipients();
  res.json({
    configured: Boolean(recipients),
    recipients: recipients || {},
    message: recipients ? undefined : "Supplier email settings are not configured on the server.",
  });
});

router.get("/email/config-status", (_req, res) => {
  res.json(recipientConfigStatus());
});

router.post("/email/send-test", async (req, res) => {
  if (!allowSend(req, res)) return;
  const recipients = configuredRecipients();
  if (!recipients) {
    res.status(503).json({ error: "Supplier email settings are not configured on the server." });
    return;
  }
  const { itemId, supplierId } = req.body ?? {};
  if (typeof itemId !== "string" || itemSupplier[itemId] !== supplierId || !supplierIds.has(supplierId)) {
    res.status(400).json({ error: "The selected item is not assigned to this supplier." });
    return;
  }
  const to = recipients[supplierId];
  const subject = "[TEST ONLY — DO NOT FULFILL] StockSync AI Gmail connection test";
  const body = `Hello ${supplierNames[supplierId]} team,\n\nThis is a test message from StockSync AI using synthetic data. It is not a purchase order. Please do not reserve, prepare, or deliver any items.\n\nSample item: ${itemNames[itemId]}\nNo quantity or payment is requested.\n\nThank you,\nStockSync AI test`;
  const fingerprint = Buffer.from(JSON.stringify(["test", supplierId, itemId, to, subject, body])).toString("base64url");
  const prior = successfulSends.get(fingerprint);
  if (prior && Date.now() - prior.at < 24 * 60 * 60 * 1000) {
    res.json({ ok: true, id: prior.id, alreadySent: true });
    return;
  }
  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: encodeMessage(to, subject, body) }),
    });
    if (!response.ok) {
      console.error("Gmail test send failed with status", response.status);
      res.status(502).json({ error: "Gmail could not send the test. Check the connected mailbox before retrying." });
      return;
    }
    const result = await response.json() as { id?: string };
    const id = typeof result.id === "string" ? result.id : "sent";
    successfulSends.set(fingerprint, { id, at: Date.now() });
    res.json({ ok: true, id });
  } catch {
    res.status(502).json({ error: "Gmail did not confirm the test send. Check Sent before retrying." });
  }
});

router.post("/email/send", async (req, res) => {
  if (!allowSend(req, res)) return;
  const recipients = configuredRecipients();
  if (!recipients) {
    res.status(503).json({ error: "Supplier email settings are not configured on the server." });
    return;
  }

  const { itemId, supplierId, to, subject, body } = req.body ?? {};
  if (typeof itemId !== "string" || itemSupplier[itemId] !== supplierId || !supplierIds.has(supplierId)) {
    res.status(400).json({ error: "The selected item is not assigned to this supplier." });
    return;
  }
  const allowedRecipient = recipients[supplierId];
  if (typeof to !== "string" || to.trim().toLowerCase() !== allowedRecipient.toLowerCase()) {
    res.status(400).json({ error: "The recipient does not match the selected supplier." });
    return;
  }
  if (
    typeof subject !== "string" || !subject.trim() || subject.length > 200 || /[\r\n]/.test(subject) ||
    typeof body !== "string" || !body.trim() || body.length > 5000
  ) {
    res.status(400).json({ error: "The email subject or body is invalid." });
    return;
  }

  const fingerprint = Buffer.from(JSON.stringify([supplierId, itemId, allowedRecipient, subject, body])).toString("base64url");
  const prior = successfulSends.get(fingerprint);
  if (prior && Date.now() - prior.at < 24 * 60 * 60 * 1000) {
    res.json({ ok: true, id: prior.id, alreadySent: true });
    return;
  }

  try {
    const connectors = new ReplitConnectors();
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: encodeMessage(allowedRecipient, subject.trim(), body) }),
    });
    if (!response.ok) {
      console.error("Gmail send failed with status", response.status);
      res.status(502).json({ error: "Gmail could not send the message. Check the connected mailbox before retrying." });
      return;
    }
    const result = await response.json() as { id?: string };
    const id = typeof result.id === "string" ? result.id : "sent";
    successfulSends.set(fingerprint, { id, at: Date.now() });
    res.json({ ok: true, id });
  } catch {
    res.status(502).json({ error: "Gmail did not confirm the send. Check the connected mailbox before retrying." });
  }
});

export default router;
