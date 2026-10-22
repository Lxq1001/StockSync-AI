---
name: Shared-mailbox sending boundaries
description: Default Gmail composer handoff on Replit and VS Code; optional legacy shared-mailbox API safety.
---

The default Order Email flow opens Gmail with the supplier, subject, and template filled in. It must work in both Replit and standalone VS Code without Google Cloud, SMTP, or Replit-mailbox configuration.

**Why:** After choosing a shared sender, the user reported the blank shared-mailbox From field and requested a simpler alternative: a Gmail sign-in/compose link with the template filled in. They do not want complex integration setup.

**How to apply:** Do not gate Open Gmail on server mailbox settings. Let Gmail handle sign-in, sender selection, and actual Send. The intended shared mailbox can be chosen there, but StockSync cannot verify the selected account. Never collect Google passwords or imply that StockSync authenticated the sender. Keep one Save, Edit, and Discard.

Opening Gmail must not create a Sent order or claim email delivery. A user-confirmed tracking record is allowed only after explicitly confirming the saved template was sent.

**Why:** A compose URL grants no Gmail API access and cannot detect sending, cancellation, account selection, or delivery.

**How to apply:** Clearly distinguish manual confirmation from legacy provider acceptance receipts. Preserve drafts if Gmail is merely opened or the user has not sent yet. If Google sign-in drops compose parameters, tell users to return and reopen the Gmail link after signing in.

If the optional legacy direct-send API is used, no-login sending is for localhost/private trusted-staff access, not an unrestricted public sending service. Server recipient approval and sending limits reduce abuse but do not authenticate visitors.

**Why:** Every visitor otherwise acts through the owner's mailbox. Supplier catalog entries are not, by themselves, permission to email those addresses.

**How to apply:** Preserve server-side recipient approval, assigned-supplier validation, private-production gating, and sending limits. Do not silently enable production or expand recipient approval from the dataset alone.

For the optional legacy direct-send API, uncertain sends must not be automatically retried, and known acceptance receipts must survive server restarts.

**Why:** A connection or browser-storage failure can occur after Gmail accepts the message; a blind retry can duplicate a real supplier order.

**How to apply:** Keep send identifiers and durable receipts, recover accepted results without another provider call, and require checking Gmail Sent for uncertain outcomes. The single-instance local journal is not shared durable cloud storage; production needs persistent storage and private access before sending is enabled.
