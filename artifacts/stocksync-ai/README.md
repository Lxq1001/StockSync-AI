# StockSync AI approval demo

## Try the visible outcome

1. Open **Controls**, select **WhatsApp · mock** or **Email · mock**, and save.
2. Open **Overview** or **Purchase orders**, then **Review** an awaiting-approval order.
3. Set a valid quantity and optional manager note, then choose **Approve & generate PO**.
4. The approval result shows the finalized PO, a working PDF download, mock supplier message and attachment, linked audit events, and **Pending Delivery**.
5. Reopen **PO & message** from Purchase orders after closing the dialog or reloading.
6. Open **Activity log** and search the PO ID to see approval, PDF generation, mock dispatch, and status change.
7. **Simulate receipt** adds the approved quantity to stock once and changes the status to Received. The finalized PO snapshot remains unchanged.

If the approval inbox is empty, open Inventory and create a draft. Existing sample orders that were already approved before PDF generation was added do not have finalized PDFs.

## Local workspace commands

From the monorepo root, after installing dependencies with pnpm:

```sh
pnpm --filter @workspace/stocksync-ai run dev
pnpm --filter @workspace/stocksync-ai run typecheck
pnpm --filter @workspace/stocksync-ai run test
pnpm --filter @workspace/stocksync-ai run build
```

## Demo boundaries

- PDFs are real files generated in the browser from saved approval snapshots.
- Both supplier channels use a **local mock adapter**, not an external API. Mock acceptance is not proof that a supplier received a message.
- Data and activity records live only in this browser. Activity is read-only in the UI but **not immutable**, not shared, and not connected to an Orbyte service.
- The manager is a sample persona, not an authenticated user. Budget and quantity limits are client-side demo controls.
- Production use requires authenticated approval on a server, append-only audit storage, and a configured supplier messaging provider.
- Reset demo explicitly erases local snapshots, messages, orders, and activity; it requires confirmation.
