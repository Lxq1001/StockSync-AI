---
name: Demo and production boundaries
description: How to interpret the procurement brief's supplier-send and immutable Orbyte audit requirements without overstating the portable demo.
---

Keep simulation and production guarantees explicit: a local mock outbox receipt is not supplier delivery, and browser-stored activity is not an immutable Orbyte record.

**Why:** The user's brief describes automated supplier contact and an immutable Orbyte activity log, but no Orbyte or live messaging service has been connected. The user also distributes source through GitHub and runs it locally in VS Code, so the demo must remain runnable without hidden hosted dependencies.

**How to apply:** Preserve clear mock labels until a provider and server-backed authorization/audit design are deliberately introduced. Never silently convert a demo receipt to a claimed real send, or call local read-only UI records immutable. When features change, keep the standalone source export compatible with local setup.
