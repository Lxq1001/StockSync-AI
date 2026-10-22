# StockSync AI

## Run locally in Visual Studio Code

Install **Node.js 22 LTS or newer supported LTS** and **pnpm**. Open a terminal
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
The current email workflow opens an external email app; opening a draft does not
verify that an email was sent or delivered.

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
pnpm run typecheck
```
