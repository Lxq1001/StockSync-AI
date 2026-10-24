# StockSync AI

A browser-local procurement demo for reviewing stock risk, opening prefilled supplier emails in the user's mail app, and tracking purchase orders.

## Run & Operate

- `pnpm install --frozen-lockfile` — install the existing workspace dependencies
- Use Node.js 24 (configured in Replit) and pnpm.
- Start both managed workflows: `artifacts/api-server: API Server` for the supplied datasets at `/api`, and `artifacts/stocksync-ai: web` for the app at `/` in Replit Preview.
- `pnpm --filter @workspace/stocksync-ai run dev` — run the frontend locally (port 5173 unless `PORT` is set; Replit supplies port 18173)
- `pnpm --filter @workspace/stocksync-ai test` — run procurement and CSV-import tests
- `pnpm --filter @workspace/stocksync-ai build` — build the frontend into `artifacts/stocksync-ai/dist/public`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- No secrets or database connection are needed for the current browser-local demo.
- The API is required to load the supplied datasets. It exposes `/api/healthz`, `/api/stock-dataset`, and optional legacy email routes. The canvas workflow is not needed to run the app and is left stopped.
- `DATABASE_URL` is required only if using the separate `@workspace/db` package; no database has been provisioned or migrated as part of setup.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Optional API: Express 5
- Optional DB package: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/stocksync-ai/src/` — existing frontend, pages, components, and browser-local procurement logic
- `artifacts/api-server/` — Express dataset, health, and optional legacy email API
- `lib/` — shared API and database workspace packages

## Architecture decisions

- Preserve the imported stack and original demo UI; run the existing dataset API without connecting the unused Python/database packages or introducing hosted dependencies.

## Product

- Inventory suggestions and edits, sales-file import, an email-template workflow, purchase-order tracking, and an Activity Log.
- Starting inventory, supplier contacts, and sales are loaded from the supplied API datasets. Edits and purchase orders are stored in this browser, not shared across users. “Open Gmail” hands a prefilled draft to Gmail. The user must send it there and separately confirm in StockSync; the app cannot verify external delivery.

## User preferences

- Retain the original demo components and theme. Keep the Activity Log unchanged. Do not reintroduce authentication or PDF generation without an explicit request.

## Gotchas

- Use pnpm, not npm or yarn, for this workspace.
- The original Express dependency resolved to a package blocked by the Replit package firewall. Express was updated to its current compatible 5.x release so installation resolves an allowed dependency.
- Browser-local activity is not an immutable server-backed audit record.
- Setup verification: root typecheck, local-routing tests, and backend email tests pass. Three existing frontend tests fail around supplied-fixture reorder suggestions and sales-import demand expectations; these failures were not changed during setup.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
