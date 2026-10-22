import { Router } from "express";
import { resolve } from "node:path";
import { SendOrderEmailBody, type EmailReceipt } from "@workspace/api-zod";
import { EmailOutbox } from "../lib/email-outbox";
import { emailSettings, deliverEmail } from "../lib/email-provider";
import { approvedSuppliers, EmailError, validEmailOrigin, validateOrderEmail } from "../lib/email-policy";

let journal: EmailOutbox | undefined;
const outbox = () => journal ??= new EmailOutbox(resolve(process.env.STOCKSYNC_EMAIL_OUTBOX_DIR ?? ".stocksync-mail", "outbox.sqlite"));

export function createEmailRouter(deps = { settings: emailSettings, deliver: deliverEmail, journal: outbox, approved: approvedSuppliers }) {
const router = Router();
router.get("/email/settings", async (_req, res) => {
  res.set("Cache-Control", "no-store").json(await deps.settings());
});

router.post("/email/send", async (req, res) => {
  res.set("Cache-Control", "no-store");
  let reservedId: string | undefined;
  try {
    if (!req.is("application/json") || !validEmailOrigin(req.get("origin"), req.get("host"), req.get("x-forwarded-host"), req.get("sec-fetch-site")))
      throw new EmailError(403, "ORIGIN_REJECTED", "Email must be sent from the StockSync page on this server.");
    const parsed = SendOrderEmailBody.safeParse(req.body);
    if (!parsed.success) throw new EmailError(400, "INVALID_EMAIL", "Check the draft, quantity, and recipient. Subject: up to 200 characters; content: up to 5,000.");
    const input = parsed.data;
    input.to = validateOrderEmail(input, deps.approved());
    const settings = await deps.settings();
    if (!settings.ready) throw new EmailError(503, "MAILBOX_NOT_READY", settings.reason);
    const previous = deps.journal().reserve(input);
    if (previous) { res.json(previous); return; }
    reservedId = input.sendId;
    const messageId = await deps.deliver(input, settings);
    const receipt: EmailReceipt = { sendId: input.sendId, messageId, from: settings.sender, acceptedAt: new Date().toISOString(), transport: settings.transport };
    deps.journal().accept(input.sendId, receipt);
    reservedId = undefined;
    res.json(receipt);
  } catch (error) {
    const known = error instanceof EmailError;
    if (reservedId) {
      try { deps.journal().fail(reservedId, known && error.code === "PROVIDER_REJECTED"); } catch { /* Pending remains blocked on storage failure. */ }
    }
    if (known) res.status(error.status).json({ code: error.code, error: error.message });
    else {
      req.log.error({ code: "EMAIL_SEND_FAILED", attempted: Boolean(reservedId) }, "Email operation failed; credentials and message content omitted");
      res.status(reservedId ? 502 : 503).json({
        code: reservedId ? "SEND_UNCERTAIN" : "OUTBOX_UNAVAILABLE",
        error: reservedId ? "The send outcome is uncertain. Check Gmail Sent before doing anything else. Automatic resending is blocked." : "The email outbox is unavailable. No email was attempted.",
      });
    }
  }
});
return router;
}
export default createEmailRouter();
