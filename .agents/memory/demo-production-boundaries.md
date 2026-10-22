---
name: Demo and production boundaries
description: How to interpret the procurement brief's supplier-send and immutable Orbyte audit requirements without overstating the portable demo.
---

Keep email acceptance and production guarantees explicit: a Gmail acceptance receipt is not verified supplier delivery. Browser-local “sent” records based on a Gmail/mail-app handoff are only user confirmations. Browser-stored activity is not an immutable Orbyte record.

**Why:** The user tried direct shared-mailbox sending, then requested the simpler Gmail composer handoff to avoid integration setup. Existing records can therefore come from either actual provider receipts or manual confirmations. There is no connected Orbyte audit service or supplier delivery verification.

**How to apply:** For server-side sending, create a Sent order only after a provider receipt. For Gmail handoff, require explicit user confirmation after sending externally, label the record as user-confirmed, and never infer sending from opening a URL. Preserve existing provider receipts without retrospectively relabeling manual records as verified. Never claim delivery was verified, label mock-only testing explicitly, and never call browser-local activity immutable.
