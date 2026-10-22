import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { ReplitConnectors } from "@replit/connectors-sdk";
import type { EmailSettings, OrderEmailInput } from "@workspace/api-zod";
import { approvedSuppliers, EmailError } from "./email-policy";

const connectors = new ReplitConnectors();
export const transport = () => process.env.STOCKSYNC_EMAIL_TRANSPORT === "smtp" || !process.env.REPL_ID ? "smtp" : "gmail";

export async function emailSettings(): Promise<EmailSettings> {
  const mode = transport();
  const base: EmailSettings = { ready: false, sender: "", transport: mode, reason: "", approvedSupplierIds: approvedSuppliers() };
  if (process.env.STOCKSYNC_EMAIL_ENABLED !== "true")
    return { ...base, reason: "Direct sending is disabled. The mailbox owner must enable STOCKSYNC_EMAIL_ENABLED on the server." };
  if (process.env.NODE_ENV === "production" && process.env.STOCKSYNC_EMAIL_PRIVATE_SINGLE_INSTANCE !== "true")
    return { ...base, reason: "No-login sending requires a private, single-instance deployment with persistent outbox storage. See README." };
  if (mode === "smtp") {
    const sender = process.env.STOCKSYNC_SMTP_USER ?? "";
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(sender) || !process.env.STOCKSYNC_SMTP_APP_PASSWORD)
      return { ...base, reason: "Local Gmail sending needs STOCKSYNC_SMTP_USER and STOCKSYNC_SMTP_APP_PASSWORD in the repository's .env.local. See README." };
    return { ...base, ready: true, sender };
  }
  try {
    const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/profile", { method: "GET" });
    if (!response.ok) return { ...base, reason: "The Gmail connection is unavailable or needs reauthorization in Replit." };
    const profile = await response.json() as { emailAddress?: string };
    if (!profile.emailAddress) throw new Error("Missing sender");
    return { ...base, ready: true, sender: profile.emailAddress };
  } catch {
    return { ...base, reason: "Could not access the Replit Gmail connection. Local runs must use the SMTP setup in README." };
  }
}

export async function deliverEmail(input: OrderEmailInput, settings: EmailSettings) {
  const message = {
    from: settings.sender, to: input.to, subject: input.subject.trim(), text: input.body,
    messageId: `<stocksync-${Buffer.from(input.sendId).toString("hex")}@stocksync.local>`,
  };
  if (settings.transport === "smtp") {
    const smtp = nodemailer.createTransport({
      service: "gmail", auth: { user: settings.sender, pass: process.env.STOCKSYNC_SMTP_APP_PASSWORD },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
    });
    try {
      const result = await smtp.sendMail(message);
      if (!result.accepted?.length) throw new EmailError(502, "PROVIDER_REJECTED", "Gmail did not accept the recipient. No order was created.");
      return result.messageId;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "EAUTH" || code === "EENVELOPE")
        throw new EmailError(502, "PROVIDER_REJECTED", "Gmail rejected the credentials or recipient. Check the local Gmail app-password setup.");
      throw error;
    } finally { smtp.close(); }
  }
  const raw = await new Promise<Buffer>((resolve, reject) =>
    new MailComposer(message).compile().build((error, buffer) => error ? reject(error) : resolve(buffer)));
  const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: raw.toString("base64url") }),
  });
  if (!response.ok) {
    if (response.status >= 400 && response.status < 500)
      throw new EmailError(502, "PROVIDER_REJECTED", "Gmail rejected the request. Check the Gmail connection and its sending permission.");
    throw new Error("Uncertain Gmail response");
  }
  const result = await response.json() as { id?: string };
  if (!result.id) throw new Error("Missing Gmail receipt");
  return result.id;
}
