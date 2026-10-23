---
name: Inventory reorder policy
description: User-defined average-use calculation, 30-day suggestion quantity, and on-hand cutoff.
---

On Inventory, average daily use is the ceiling of latest weekly sales divided by 7. Suggested quantity is average daily use multiplied by 30, for items whose on-hand quantity is at most 7. Ordinary new-workspace stock is randomized between 15 and 30, with three highest-demand demo items seeded at 5–7; each imported sale quantity reduces the affected stock, floored at zero.

**Why:** The user explicitly requested these formulas and corrected the page name from Purchase Orders to Inventory. On October 23, 2026, they also requested randomized starting stock, inventory deductions when importing sales, and visible suggested tasks for demos. The cutoff is on-hand quantity, not days of estimated cover.

**How to apply:** Keep the Inventory display, sales imports, restored workspaces, suggested tasks, and newly generated order drafts consistent with these rules. Apply stock deductions only for uploaded import rows; keep starting dataset transactions as historical demand, not sales applied a second time. Clear dismissed suggestions for imported products so fresh data can make them eligible again. Do not apply the former lead-time/buffer/batch formula to suggested quantities. Keep existing purchase-order quantities unchanged; a revised forecast is not a revision to a historical order.
