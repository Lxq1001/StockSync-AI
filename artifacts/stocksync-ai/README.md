# StockSync AI store procurement demo

A browser-local procurement assistant for a Malaysian store. No sign-in, no server calls, no real email.
The manager persona is **Aina Rahman** (demo only, not authenticated).

## Pages
- `/` Overview (`/user-portal` redirects here): **Import** sales, Inventory and Purchase Orders module blocks, View all goes to Purchase orders.
- `/inventory`: **AI suggested tasks** list items whose estimated cover (on hand / average daily use) is 7 days or less.
  Approve opens `/template` with the item and suggested quantity; Reject dismisses that suggestion until Reset demo.
  The main table has Edit (name, on hand, unit cost) and Order (quantity + total, Confirm opens `/template`). Cover of 7 days or less is shown in red.
- `/template`: email-style draft (To, From, Subject, Content), read-only until **Edit**. **Send (demo)** validates fields,
  records a simulated send locally (no real email), creates one purchase order with status **Sent** and opens Purchase orders.
  Unsent drafts survive reload.
- `/purchase-orders`: status dropdown with exactly Sent, Pending Delivery, Received. Status is tracking only and never changes stock.
- `/activity`: unchanged activity log.

## Sales import formats (only these)
- CSV with header `itemId,date,quantity` (quoted fields supported)
- JSON array: `[{ "itemId": "sku-002", "date": "2025-04-18", "quantity": 9 }]`

Dates are `YYYY-MM-DD`, quantity is a finite number of 0 or more, itemId must exist. Max 512 KB / 5,000 rows.
All rows must be valid or nothing is applied. The 7-day demand window ends on the latest date in the file;
each imported item's average daily demand becomes its window total / 7. Stock on hand is not decremented.
This is not a database connector. A sample CSV can be downloaded from the import dialog.

## Storage
State is saved under `stocksync-demo-v2`. A valid anonymous `stocksync-demo-v1` workspace is migrated once
(Pending Delivery / Received orders kept; earlier Awaiting approval / Rejected entries are listed separately and
never relabelled Sent). Former account-keyed data (`stocksync-demo-v1:<userId>`) is never read and left untouched.

## Tests
`pnpm --filter @workspace/stocksync-ai test` runs `src/lib/procurement.test.ts` (state helpers, migration, import).
