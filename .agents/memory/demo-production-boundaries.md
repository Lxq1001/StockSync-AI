---
name: Demo and production boundaries
description: How to interpret the procurement brief's supplier-send and immutable Orbyte audit requirements without overstating the portable demo.
---

Keep external email handoff and production guarantees explicit: opening a prefilled Gmail compose page is not delivery, and a browser-local “sent” status records only the user's confirmation, not verified delivery. Browser-stored activity is not an immutable Orbyte record.

**Why:** The user chose a direct Gmail compose-page handoff rather than Gmail API/OAuth: a prefilled Gmail page opens in a new tab, the user must be signed into Gmail and send it there, then confirms in the app. There is still no connected Orbyte audit service or delivery verification. The user also distributes source through GitHub and runs it locally in VS Code, so the demo must remain runnable without hidden hosted dependencies.

**How to apply:** Label the action as opening a Gmail draft and create a Sent purchase-order record only after explicit user confirmation. Never claim delivery was verified. Preserve clear mock labels on purely local sends, and never call browser-local activity immutable. Keep the standalone source export compatible with local setup.
