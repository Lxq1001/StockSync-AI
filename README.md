# StockSync AI

## Run locally in Visual Studio Code

Install **Node.js 22.16+ LTS or Node.js 24 LTS** and **pnpm**. Open a terminal
in the repository root (the folder containing `pnpm-workspace.yaml`), then run:

```sh
pnpm install
pnpm dev
```

Wait for **StockSync is ready**, then open **http://localhost:3000**.
Keep the terminal running. Press **Ctrl+C** to stop.

The root command builds the shared libraries and API, starts both services, and
provides a local router:

| Address | Purpose |
| --- | --- |
| `http://localhost:3000` | Open the app here; frontend and `/api` work together |
| `http://localhost:5173` | Frontend server only; do not use as the app entry point |
| `http://localhost:8080/api/stock-dataset` | API supplying inventory, supplier contacts, and sales |

No Replit login, external database, or secrets are needed to load the supplied
datasets. Browser-local edits and orders remain local to that browser.
The default Order Email page opens a filled Gmail composer in a new tab.
It needs no Google Cloud project, Replit Gmail connection, SMTP credentials,
or website login. Sign in to Gmail if necessary and click Send inside Gmail.

## Simple supplier email (default)

The page has **Open Gmail**, **Edit**, one **Save**, and **Discard**.
Edit changes the subject and content locally; Save persists the edited template.
Discard while editing restores the saved template; otherwise it removes the draft.
The To address comes from the assigned supplier. Gmail fills the actual From
address after you choose a Gmail account; choose your shared mailbox there if that
is the intended sender. Subject and the full template are carried in the Gmail link.

After sending inside Gmail, return to StockSync and confirm **I sent it — record
order** if you want purchase-order tracking. Opening Gmail alone never creates a
Sent order. The app cannot detect a Gmail send or verify delivery; these records
are explicitly based on your confirmation. **Not sent yet** keeps the draft.
If Google's sign-in redirects to the inbox instead of the composer, return to
StockSync and click Open Gmail again after signing in.

This works the same in Replit and at `http://localhost:3000`.

## Optional server-side sending (existing backend, not used by the default page)

The earlier direct-send API remains available for an owner-managed shared mailbox.
The following configuration is only needed if you separately use that API—not
for the default Open Gmail flow. Set `STOCKSYNC_EMAIL_ENABLED=false` on the API
if you do not intend to use direct sending. Existing server receipts are retained.

### On Replit

Use the connected Gmail integration. Set the non-secret server environment variables
`STOCKSYNC_EMAIL_ENABLED=true` and `STOCKSYNC_EMAIL_TRANSPORT=gmail`.
The server secret `STOCKSYNC_SUPPLIER_RECIPIENTS_JSON` must explicitly approve
the supplier's real catalog email, e.g. `{"S1":"supplier@example.com"}`.
An array of approved email strings is also supported. Catalog addresses alone
never authorize sending. No website-user login is added.

### In VS Code / localhost

Replit's Gmail authorization is not included in a GitHub download.

1. In your Google account, enable **2-Step Verification**, then create an
   **App Password** for this application. Use a dedicated store mailbox.
   Some managed/organization accounts do not allow App Passwords; ask their admin.
   Never use your ordinary Gmail password.
2. Copy `.env.example` to `.env.local` in the **repository root**.
3. Fill in `STOCKSYNC_SMTP_USER` and `STOCKSYNC_SMTP_APP_PASSWORD` there.
   Keep `STOCKSYNC_EMAIL_TRANSPORT=smtp` and `STOCKSYNC_EMAIL_ENABLED=true`.
4. Set `STOCKSYNC_SUPPLIER_RECIPIENTS_JSON` to the exact real supplier emails
   you approve, matching the supplied supplier catalog.
5. Restart `pnpm dev`, then open `http://localhost:3000`.

The local launcher loads `.env.local` into the API only, never into the browser.
Do not add `VITE_` prefixes to mail credentials. `.env.local` is excluded from Git
and deployment. Google may block SMTP if credentials or account policy are invalid;
the page will show an error rather than creating a fake Sent order.

### Safety and storage

Anyone who can access this no-login page can initiate allowed supplier emails.
**Use it only on localhost or a private, trusted-staff workspace/network.**
Recipient allowlisting, same-origin checks, a 10-second send interval, and a cap
of 10 attempted drafts per rolling 24 hours reduce abuse; they do NOT authenticate
visitors. Do not expose the endpoint as an unrestricted public email service.

A server SQLite journal in the API working directory's `.stocksync-mail/` stores
send fingerprints and provider receipts, not mailbox passwords or email bodies.
Do not delete it to retry an email. Retrying an accepted draft returns the existing
receipt. Pending or uncertain attempts are blocked; check **Gmail Sent** before
manually creating another order. A timeout may occur after Gmail already accepted
a message. Provider acceptance is **not delivery confirmation**.

Browser purchase orders are created only after a provider receipt is returned.
If browser saving fails, keep the same draft and press Send again to recover
the existing receipt without sending another email.

For production, sending is disabled unless
`STOCKSYNC_EMAIL_PRIVATE_SINGLE_INSTANCE=true` is explicitly set. Only set this
after arranging private access and persistent storage, with
`STOCKSYNC_EMAIL_OUTBOX_DIR` pointing to that storage. An ephemeral or multi-instance
deployment is not supported for this SQLite journal: use shared durable storage
before enabling it there. Replacing or downloading the repository does not transfer
previous send receipts; check Gmail Sent before repeating old orders.

### Troubleshooting

- **Unexpected token `<` / HTML instead of JSON:** You opened the frontend-only
  address, or started only Vite. Stop those terminals, run `pnpm dev` from the
  repository root, and use the **StockSync is ready** URL.
- **Port already in use:** Stop previous local runs using ports 3000, 5173,
  and 8080 before starting again.
- **Downloaded an older GitHub copy:** Pull or download the latest committed
  version containing this README and the root `dev` script.

Replit continues to use its existing managed workflows and path router.
The local launcher does not replace or change those workflows.

## Checks

```sh
pnpm test:local
pnpm --filter @workspace/stocksync-ai test
pnpm --filter @workspace/api-server test
pnpm run typecheck
```
