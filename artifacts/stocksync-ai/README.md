# StockSync AI approval demo

## Accounts and sign-in

The public homepage links to branded Clerk sign-in and account creation.
Signed-in users enter `/user-portal`; inventory, purchase orders and activity require sign-in.
The account menu supports account settings, and **Sign out** returns to the public homepage.

Each account has separate browser-local demo data. Signing in does not copy the old anonymous
workspace into the account; the old browser key is left untouched. Data is not synced across
devices or shared with other accounts.

Replit provisions the Clerk configuration automatically. For a local checkout, configure
`VITE_CLERK_PUBLISHABLE_KEY` in `artifacts/stocksync-ai/.env.local` using your Clerk
development publishable key, then restart Vite. Do not commit local environment files.
The API server also needs `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` supplied securely.
Never put the secret key in Vite variables or browser code. Production on Replit uses the
provided Clerk proxy; the API server must be included when publishing.

## Try the visible outcome

1. Create an account or sign in, then open **Controls**, select **WhatsApp · mock** or **Email · mock**, and save.
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
- New approvals use the signed-in account's name. Seeded historical entries still use sample personas. Budget and quantity limits remain client-side demo controls, not server authorization.
- Production use requires authenticated approval on a server, append-only audit storage, and a configured supplier messaging provider.
- Reset demo explicitly erases local snapshots, messages, orders, and activity; it requires confirmation.
