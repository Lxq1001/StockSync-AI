---
name: UI scope boundaries
description: User-directed baseline and exclusions for StockSync's inventory-to-email demo.
---

Keep the original repository's demo components and theme as the baseline. The user explicitly removed the subsequently added authentication and PDF generator and requested that the original Activity Log page remain visually unchanged. They later explicitly requested removing the “tracking only, stock not changed” suffix from order-status activity entries.

**Why:** The requested product demonstration is inventory suggestions and edits, an email-template workflow, and purchase-order tracking—not the added login/PDF workflow. The user approved this narrow Activity Log copy change without requesting a layout redesign.

**How to apply:** Do not reintroduce authentication, PDF downloads, or redesign the Activity Log without an explicit request. Status-change details should name the order and old/new statuses without “tracking only, stock not changed.” Local simulated sends must remain clearly labeled. Unused account-specific browser data must not be surfaced in the anonymous workspace.

Use the user's latest attached component files as the visual baseline for the pages they identify, but retain working data and email integrations when an attachment contains an older functional snapshot.

**Why:** The user supplies partial UI revisions separately from dataset and email changes. Replacing functional code wholesale with those snapshots can undo integration work.

**How to apply:** Compare attachments to the current source before editing; merge visual changes without reintroducing obsolete sample IDs or fabricated supplier addresses.
