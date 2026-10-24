# StockSync AI

StockSync AI is a predictive inventory management demo that helps retailers monitor stock, review sales-based replenishment suggestions and organize supplier ordering.

## Team Information

| Field                 | Details                            |
| --------------------- | ---------------------------------- |
| **Team Name**         | 404 Sleep Not Found                |
| **Team Domain**       | Domain 2: ALPHA RED                |
| **SDG Track**         | 8: Decent Work and Economic Growth |
| **Team Leader**       | Ling Xin Qi                        |
| **University**        | Universiti Sains Malaysia          |
| **Number of Members** | 3                                  |

## Links

| Resource              | Link                                             |
| --------------------- | ------------------------------------------------ |
| **GitHub Repository** | https://github.com/Lxq1001/StockSync-AI                |
| **Live Demo**         | https://stock-sync-ai.replit.app    |
| **Live Demo**         | https://canva.link/ywfvc9k4z39gmaq    |
| **Demo Video**     | https://youtu.be/bbFCNg9W7RY |

## Overview

### Problem

Retailers need to keep track of stock, sales activity and supplier orders. When this information is handled manually or separately, it can be difficult to identify which products need attention and prepare replenishment orders efficiently.

### Solution

StockSync AI uses supplied inventory and sales data to calculate average daily use and estimated stock cover. It highlights products with estimated cover of 7 days or less and suggests a reorder quantity equal to 30 days of average use. Users can review suggestions, prepare supplier email drafts, and track purchase order statuses.

The current demo uses deterministic, rule-based calculations. It does not call an external AI model or RunPod endpoint.

### Key Features

- **Inventory and sales import** — Load the supplied JSON datasets or import sales from a supported CSV or JSON file.
- **Stock-cover monitoring** — Review on-hand quantities, average daily use, and estimated days of cover.
- **Replenishment suggestions** — See eligible low-cover items and suggested quantities.
- **Supplier ordering workflow** — Prepare supplier email drafts and track purchase order statuses.
- **Demo reset** — Restore the original inventory and sales data from the supplied JSON files.

### Technology

| Area            | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Frontend        | React, TypeScript, Vite                                       |
| API             | Node.js, Express                                              |
| Data            | Supplied JSON files and browser-local workspace state         |
| Package manager | pnpm                                                          |
| AI / compute    | Rule-based calculations; no external model or RunPod endpoint |
| Development     | Replit and local development                                  |

## Project Structure

```
.
|-- artifacts/
|   |-- stocksync-ai/                         Main StockSync AI web app
|   |   |-- .replit-artifact/
|   |   |   `-- artifact.toml
|   |   |-- public/
|   |   |   |-- favicon.svg
|   |   |   |-- logo.svg
|   |   |   `-- robots.txt
|   |   |-- src/
|   |   |   |-- components/
|   |   |   |   |-- common.tsx
|   |   |   |   |-- error-boundary.tsx
|   |   |   |   |-- import-modal.tsx
|   |   |   |   |-- item-modals.tsx
|   |   |   |   |-- shell.tsx
|   |   |   |   `-- ui/                         Shared UI components
|   |   |   |-- hooks/
|   |   |   |   |-- use-mobile.tsx
|   |   |   |   `-- use-toast.ts
|   |   |   |-- lib/
|   |   |   |   |-- dataset-request.ts
|   |   |   |   |-- procurement.ts
|   |   |   |   |-- procurement.test.ts
|   |   |   |   |-- provided-dataset.ts
|   |   |   |   |-- sales-import.ts
|   |   |   |   `-- utils.ts
|   |   |   |-- pages/
|   |   |   |   |-- activity.tsx
|   |   |   |   |-- inventory.tsx
|   |   |   |   |-- not-found.tsx
|   |   |   |   |-- orders.tsx
|   |   |   |   |-- overview.tsx
|   |   |   |   `-- template.tsx
|   |   |   |-- App.tsx
|   |   |   |-- index.css
|   |   |   `-- main.tsx
|   |   |-- components.json
|   |   |-- index.html
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   `-- vite.config.ts
|   |
|   |-- api-server/                            Stock and email API
|   |   |-- .replit-artifact/
|   |   |   `-- artifact.toml
|   |   |-- src/
|   |   |   |-- data/
|   |   |   |   |-- import_data.json
|   |   |   |   |-- mock_db.json
|   |   |   |   |-- sales_transaction.json
|   |   |   |   `-- suppliers.json
|   |   |   |-- lib/
|   |   |   |   |-- email-outbox.ts
|   |   |   |   |-- email-policy.ts
|   |   |   |   |-- email-provider.ts
|   |   |   |   |-- email.test.ts
|   |   |   |   `-- logger.ts
|   |   |   |-- middlewares/
|   |   |   |-- routes/
|   |   |   |   |-- email.ts
|   |   |   |   |-- health.ts
|   |   |   |   `-- index.ts
|   |   |   |-- app.ts
|   |   |   `-- index.ts
|   |   |-- build.mjs
|   |   |-- development.mjs
|   |   |-- package.json
|   |   `-- tsconfig.json
|   |
|   `-- mockup-sandbox/                        Separate design preview workspace
|       |-- .replit-artifact/
|       |   `-- artifact.toml
|       |-- src/
|       |   |-- components/
|       |   |   |-- mockups/                   Saved visual mockup
|       |   |   `-- ui/                        Shared UI component files
|       |   |-- hooks/
|       |   |-- lib/
|       |   |-- App.tsx
|       |   |-- index.css
|       |   `-- main.tsx
|       |-- components.json
|       |-- index.html
|       |-- mockupPreviewPlugin.ts
|       |-- package.json
|       |-- tsconfig.json
|       `-- vite.config.ts
|
|-- lib/                                       Shared workspace packages
|   |-- api-client-react/                      Generated API client
|   |   |-- src/
|   |   |   |-- generated/
|   |   |   |-- custom-fetch.ts
|   |   |   `-- index.ts
|   |   `-- package.json
|   |-- api-spec/
|   |   |-- openapi.yaml                       API contract
|   |   |-- orval.config.ts
|   |   `-- package.json
|   `-- api-zod/                               Generated API schemas and types
|       |-- src/generated/
|       `-- package.json
|
|-- scripts/
|   |-- src/
|   |   |-- check-package-manager.mjs
|   |   |-- dev-local.mjs
|   |   |-- hello.ts
|   |   |-- local-gateway.mjs
|   |   |-- local-gateway.test.mjs
|   |   |-- pnpm-command.mjs
|   |   `-- pnpm-command.test.mjs
|   |-- package.json
|   |-- post-merge.sh
|   `-- tsconfig.json
|
|-- submission/
|   |-- REPLIT PROOF OF USE.pdf
|   `-- SDC2026_404 Sleep Not Found_Preliminary.pdf
|   `-- SDC2026_404 Sleep Not Found_TechDeclaration.pdf
|
|-- .env.example
|-- .gitignore
|-- .npmrc
|-- .replit
|-- .replitignore
|-- LICENSE
|-- package.json
|-- pnpm-lock.yaml
|-- pnpm-workspace.yaml
|-- pyproject.toml                           Legacy Python setup; not used by app workflows
|-- README.md
|-- replit.md
|-- tsconfig.base.json
|-- tsconfig.json
`-- uv.lock                                  Legacy Python lockfile; not used by app workflows
```

### Data files

- `mock_db.json` contains the supplied inventory and starting stock quantities.
- `suppliers.json` contains the supplier records and contact details.
- `sales_transaction.json` contains the supplied historical sales used to calculate demand.
- `import_data.json` contains the sample sales data available for import.

The JSON files are the static source data. Imports and edits update the browser-local workspace; **Local workspace** restores the supplied baseline.

## How to Run

### Option 1 — Run the Live Prototype

Open StockSync AI: https://stock-sync-ai.replit.app
No setup is required.

### Option 2 — Run Locally

Make sure Node.js and pnpm are installed, then run the following commands:

```powershell
# 1. Clone the repository:
git clone https://github.com/Lxq1001/StockSync-AI
cd StockSync-AI

# 2. Install project dependencies:
pnpm install

# 3. If it shows a security error, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 4. Then continue with:
pnpm install

# 5. Approve dependency build scripts:
pnpm approve-builds
# Press <space> to select, <enter> to confirm, then "y" to confirm.

# 6. Start the development server:
pnpm dev
```

Open the local address shown in the terminal. The development application is expected to be available at **http://localhost:3000**.

## How We Use Replit

- **Development and preview:** Replit workflows run the web application and API server.
- **Deployment:** The app is deployed with Replit Deployments at the Live Demo link above.
- **Credentials:** The inventory demo does not require API credentials. Do not commit secrets to GitHub.
- **Proof of use:** [`submission/REPLIT PROOF OF USE.pdf`]

## RunPod

RunPod is not currently used by StockSync AI. The project has no RunPod endpoint configured or called.

## Challenges & Learnings

- Inventory data handling: Working with inventory and sales data highlighted the importance of keeping information organised and usable.
- Workflow integration: Connecting inventory monitoring, restocking suggestions and supplier communication helped us understand how different steps can be brought together in one application.
- User-centred design: We learned the importance of presenting stock information and recommendations clearly so users can review them before taking action.
- Testing and reliability: We learned that application workflows, configuration and external integrations need to be tested before deployment.

## Future Improvements

- **Improve Data Accuracy:** Ensure inventory and sales data are accurate, complete and up to date to generate more reliable restocking recommendations.
- **Adapt to Demand and Supply Changes:** Improve the system’s ability to account for unexpected changes in customer demand, supplier delays and stock availability.
- **Automate Supplier Communication Tracking:** Integrate email monitoring to detect supplier replies and negotiation outcomes, enabling purchase order statuses to be updated automatically where appropriate.
- **Enhance Order Status Management:** Reduce manual updates by linking supplier communications with purchase order status tracking.
- **Improve Data Persistence and Scalability:** Consider replacing local JSON files with a suitable database to support more reliable data storage, concurrent access and future growth.
- **Strengthen End-to-End Automation:** Further streamline the restocking and supplier ordering process while maintaining human review and approval where necessary.

## Team

| Name                     | Role         | GitHub                     |
| ------------------------ | ------------ | -------------------------- |
| Ling Xin Qi              | Group Leader  | https://github.com/Lxq1001 |
| Chia Lee En | Group Member | https://github.com/chialeeen |
| Ooi Wan Ting | Group Member | https://github.com/WanTing30 |

## Submission Checklist

- [x] Team name, domain, SDG track, team leader, university, and member count included
- [x] GitHub, Replit, Live Demo, and Pitching Demo links added
- [x] Replit proof-of-use document added if required
- [x] Challenges, learnings, and team member details completed
- [x] How-to-run steps checked against the project scripts
- [x] No API keys or secrets included in this README

## License

This project is licensed under the [Apache License 2.0](LICENSE).
