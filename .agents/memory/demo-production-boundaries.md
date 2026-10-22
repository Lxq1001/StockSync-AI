---
name: Demo and production boundaries
description: How to interpret the procurement brief's supplier-send and immutable Orbyte audit requirements without overstating the portable demo.
---

Keep external email handoff and production guarantees explicit: opening a prefilled mailto draft is not delivery, and a browser-local “sent” status records only the user's confirmation, not verified delivery. Browser-stored activity is not an immutable Orbyte record.

**Why:** The user chose a mail-app handoff rather than Gmail API/OAuth: the browser opens a prefilled draft, the user sends it externally, then confirms in the app. There is still no connected Orbyte audit service or delivery verification. The user also distributes source through GitHub and runs it locally in VS Code, so the demo must remain runnable without hidden hosted dependencies.

**How to apply:** For the mailto flow, label the action as opening the user's email app and create a Sent purchase-order record only after explicit user confirmation. Never claim delivery was verified. Preserve clear mock labels on purely local sends, and never call browser-local activity immutable. Keep the standalone source export compatible with local setup.
