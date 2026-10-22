---
name: Demo and production boundaries
description: How to interpret the procurement brief's supplier-send and immutable Orbyte audit requirements without overstating the portable demo.
---

Keep email acceptance and production guarantees explicit: a Gmail acceptance receipt is not verified supplier delivery. Older browser-local “sent” records based on a mail-app handoff are only user confirmations. Browser-stored activity is not an immutable Orbyte record.

**Why:** The user replaced the previous mail-app handoff with direct shared-mailbox sending on 2026-10-22. There is still no connected Orbyte audit service or supplier delivery verification. Older handoff records must not be retrospectively represented as provider-verified sends.

**How to apply:** Create a new Sent order only after the server returns an actual provider acceptance receipt. Distinguish these records from older user-confirmed or simulated sends. Never claim delivery was verified, label mock-only testing explicitly, and never call browser-local activity immutable.
