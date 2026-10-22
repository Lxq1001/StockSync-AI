---
name: Inventory snapshot and sales history
description: Why historical sales imports change demand but not stock, and which supplier terms remain assumptions.
---

Treat the supplied catalog's stock as an inventory snapshot. Historical sales imports recalculate demand; they must not deduct that history from the snapshot again.

**Why:** The uploaded catalog already supplies stock counts alongside separately dated sales histories. Applying both as stock movements could double-deduct inventory. The later dated import file is a previewable update, not an instruction to place supplier orders.

**How to apply:** Preserve explicit preview/apply for imports and confirmation before replacing existing local catalog values. Keep orders, drafts, and activity when loading a new catalog. Do not treat sample lead times, minimum quantities, or the ambiguous item_price field as verified supplier procurement terms before live ordering.
