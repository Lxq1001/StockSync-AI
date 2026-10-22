---
name: Inventory reorder policy
description: User-defined average-use calculation, 30-day suggestion quantity, and on-hand cutoff.
---

On Inventory, average daily use is the ceiling of latest weekly sales divided by 7. Suggested quantity is average daily use multiplied by 30, for items whose on-hand quantity is at most 7.

**Why:** The user explicitly requested these formulas and corrected the page name from Purchase Orders to Inventory. The cutoff is on-hand quantity, not days of estimated cover.

**How to apply:** Keep the Inventory display, sales imports, restored workspaces, suggested tasks, and newly generated order drafts consistent with these rules. Do not subtract existing stock or apply the former lead-time/buffer/batch formula to suggested quantities. Keep existing purchase-order quantities unchanged; a revised forecast is not a revision to a historical order.
