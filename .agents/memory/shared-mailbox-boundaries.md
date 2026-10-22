---
name: Shared-mailbox sending boundaries
description: User-required no-login sending on both Replit and VS Code, with private access and conservative retry behavior.
---

Supplier email must work in both Replit and a standalone VS Code download. Keep one owner-configured shared Gmail sender without website login or per-visitor Google sign-in.

**Why:** The user explicitly confirmed retaining one shared Gmail sender after considering per-user Google authorization and declining the Google Cloud setup. Both Replit and VS Code remain required; a source download does not transfer Replit's mailbox authorization.

**How to apply:** Retain a Replit Gmail connection for hosted development and a separately owner-configured Gmail SMTP option for local development. Keep From tied to the actual shared sending account and credentials server-only, outside source exports. Do not add a Google account selector, OAuth callback, website signup, or password-entry form unless the user explicitly changes this decision. No Google Cloud client setup is needed for the existing Replit shared-mailbox mode.

No-login sending is for localhost/private trusted-staff access, not an unrestricted public sending service. Server recipient approval and sending limits reduce abuse but do not authenticate visitors.

**Why:** Every visitor otherwise acts through the owner's mailbox. Supplier catalog entries are not, by themselves, permission to email those addresses.

**How to apply:** Preserve server-side recipient approval, assigned-supplier validation, private-production gating, and sending limits. Do not silently enable production or expand recipient approval from the dataset alone.

Uncertain sends must not be automatically retried, and known acceptance receipts must survive server restarts.

**Why:** A connection or browser-storage failure can occur after Gmail accepts the message; a blind retry can duplicate a real supplier order.

**How to apply:** Keep send identifiers and durable receipts, recover accepted results without another provider call, and require checking Gmail Sent for uncertain outcomes. The single-instance local journal is not shared durable cloud storage; production needs persistent storage and private access before sending is enabled.
