---
name: Demo and production boundaries
description: How to interpret the procurement brief's supplier-send and immutable Orbyte audit requirements without overstating the portable demo.
---

Keep Gmail acceptance, recipient delivery, and local tracking distinct. A successful Gmail API response confirms that Gmail accepted the send; it does not prove supplier receipt or fulfillment. Browser-stored activity is not an immutable Orbyte record.

**Why:** The user subsequently chose server-side sending through a shared connected Gmail account without adding app login. Supplier contacts are runtime configuration rather than source-code constants because the source is distributed through GitHub and run locally. There is still no connected Orbyte audit service or supplier-delivery verification.

**How to apply:** Keep the sender server-side and restrict recipients. Before an agent-triggered send, show the exact recipient and message and obtain confirmation in a separate turn. Test messages must say not to fulfill and must not create purchase orders. Record real orders as Sent only after Gmail confirms. Do not claim a recipient allowlist or rate limiting provides user access control: a publicly accessible no-login app still exposes a shared sending action. Keep the local workspace usable when the hosted sender is unavailable.
