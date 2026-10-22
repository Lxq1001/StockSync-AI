---
name: Shared-mailbox sending boundaries
description: User-required no-login sending on both Replit and VS Code, with private access and conservative retry behavior.
---

Supplier email must work in both Replit and a standalone VS Code download. The existing working mode uses an owner-configured shared Gmail mailbox without website login.

**Why:** The user explicitly requested actual sending without adding a website login, and selected both environments. A source download does not transfer Replit's mailbox authorization.

**How to apply:** Retain a Replit Gmail connection for hosted development and a separately owner-configured Gmail SMTP option for local development. Keep credentials server-only and outside source exports. No website account or sign-in page should be introduced as an implicit prerequisite.

The user subsequently requested connecting each user's own Google account from the Order Email From section. This explicitly permits Google authorization for choosing the sender; the earlier no-login requirement must not be used to reject that request.

**Why:** The user wants users to send through their own Google accounts, rather than relying solely on the owner's shared mailbox.

**How to apply:** Use Google's hosted sign-in and Gmail sending consent, never a StockSync form collecting Google passwords. Keep account connection separate from a full website signup system unless requested. Preserve the existing working shared mode until a replacement is deliberately enabled, but never silently fall back to the shared mailbox after a personal-account authorization or send failure.

No-login sending is for localhost/private trusted-staff access, not an unrestricted public sending service. Server recipient approval and sending limits reduce abuse but do not authenticate visitors.

**Why:** Every visitor otherwise acts through the owner's mailbox. Supplier catalog entries are not, by themselves, permission to email those addresses.

**How to apply:** Preserve server-side recipient approval, assigned-supplier validation, private-production gating, and sending limits. Do not silently enable production or expand recipient approval from the dataset alone.

Uncertain sends must not be automatically retried, and known acceptance receipts must survive server restarts.

**Why:** A connection or browser-storage failure can occur after Gmail accepts the message; a blind retry can duplicate a real supplier order.

**How to apply:** Keep send identifiers and durable receipts, recover accepted results without another provider call, and require checking Gmail Sent for uncertain outcomes. The single-instance local journal is not shared durable cloud storage; production needs persistent storage and private access before sending is enabled.
