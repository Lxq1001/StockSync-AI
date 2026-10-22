import { Router, type Request, type Response } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();
const supplierIds = new Set(["S1", "S2", "S3"]);
const itemSupplier: Record<string, string> = {
  SKU1: "S1", SKU2: "S1", SKU3: "S1", SKU4: "S1", SKU5: "S1",
  SKU6: "S2", SKU7: "S2", SKU8: "S2", SKU9: "S2", SKU10: "S2",
  SKU11: "S3", SKU12: "S3", SKU13: "S3", SKU14: "S3", SKU15: "S3",
};
const supplierNames: Record<string, string> = {
  S1: "DailySun Sdn Bhd", S2: "PadiMas Sdn Bhd", S3: "LifeThings Sdn Bhd",
};
const itemNames: Record<string, string> = {
  SKU1: "Fresh Milk (1L)", SKU2: "Butter (250G)", SKU3: "Eggs (10 pcs)", SKU4: "Cheese (200G)", SKU5: "Yogurt (500G)",
  SKU6: "Rice (5KG)", SKU7: "Bread (400g)", SKU8: "Instant Noodles (5 PACK)", SKU9: "Flour (1KG)", SKU10: "Cooking Oil (1KG)",
  SKU11: "Toothpaste (150G)", SKU12: "Shampoo (650ML)", SKU13: "Body Wash (500ML)", SKU14: "Laundry Detergent (2KG)", SKU15: "Dishwashing Liquid (900ML)",
};
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const sendTimes = new Map<string, number[]>();
const successfulSends = new Map<string, { id: string; at: number }>();

function configuredRecipients(): Record<string, string> | null {
  const raw = process.env.STOCKSYNC_SUPPLIER_RECIPIENTS_JSON;
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const valid: Record<string, string> = {};
    for (const [id, address] of Object.entries(parsed)) {
      if (supplierIds.has(id) && typeof address === "string" && emailPattern.test(address.trim())) {
        valid[id] = address.trim();
      }
    }
    return Object.keys(valid).length === supplierIds.size ? valid : null;
  } catch {
    return null;
  }
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
