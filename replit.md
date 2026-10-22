# StockSync AI

A browser-local procurement demo for reviewing stock risk, preparing simulated supplier emails, and tracking purchase orders.

## Run & Operate

- `pnpm install --frozen-lockfile` — install the existing workspace dependencies
- Start the managed workflow `artifacts/stocksync-ai: web` to open the app at `/` in Replit Preview.
- `pnpm --filter @workspace/stocksync-ai run dev` — run the frontend locally (port 5173 unless `PORT` is set; Replit supplies port 18173)
- `pnpm --filter @workspace/stocksync-ai test` — run procurement and CSV-import tests
- `pnpm --filter @workspace/stocksync-ai build` — build the frontend into `artifacts/stocksync-ai/dist/public`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- No secrets or database connection are needed for the current browser-local demo.
- The API server and canvas have managed workflows but are not needed for the demo and are left stopped. The API currently exposes only a health route.
- `main.py` and `runpod/handler.py` contain a separate Python restock service that the frontend does not call. It is not started by the demo workflow; FastAPI/Uvicorn are not declared in its Python dependencies.
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
- `artifacts/api-server/` — separate Express health API
- `lib/` — shared API and database workspace packages
- `main.py`, `runpod/handler.py` — standalone Python analysis service

## Architecture decisions

- Preserve the imported stack and original demo UI; setup does not connect the unused Python/API/database packages or introduce hosted dependencies.

## Product

- Inventory suggestions and edits, sales-file import, an email-template workflow, purchase-order tracking, and an Activity Log.
- Data is stored in this browser, not shared across users. Supplier sends are simulated, not actual email delivery.

## User preferences

- Retain the original demo components and theme. Keep the Activity Log unchanged. Do not reintroduce authentication or PDF generation without an explicit request.

## Gotchas

- Use pnpm, not npm or yarn, for this workspace.
- The original Express dependency resolved to a package blocked by the Replit package firewall. Express was updated to its current compatible 5.x release so installation resolves an allowed dependency.
- Browser-local activity is not an immutable server-backed audit record.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
