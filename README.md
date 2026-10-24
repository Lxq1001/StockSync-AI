# StockSync AI

StockSync AI is a predictive inventory management demo that helps retailers monitor stock, review sales-based replenishment suggestions, and organize supplier ordering.

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
| **GitHub Repository** | `[Add the GitHub repository URL]`                |
| **Replit Project**    | `[Add the Replit project URL]`                   |
| **Live Demo**         | `[Add the published demo URL when available]`    |
| **Pitching Demo**     | `[Add the pitch presentation or demo video URL]` |

## Overview

### Problem

Retailers need to keep track of stock, sales activity, and supplier orders. When this information is handled manually or separately, it can be difficult to identify which products need attention and prepare replenishment orders efficiently.

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

```text
.
├── artifacts/
│   ├── api-server/
│   │   └── src/data/
│   │       ├── import_data.json
│   │       ├── mock_db.json
│   │       ├── sales_transaction.json
│   │       └── suppliers.json
│   └── stocksync-ai/       # React and Vite web app
├── lib/                    # Shared API and type libraries
├── scripts/                # Local development launcher and checks
├── package.json            # Root workspace commands
├── pnpm-workspace.yaml
└── README.md
```

### Data files

- `mock_db.json` contains the supplied inventory and starting stock quantities.
- `suppliers.json` contains the supplier records and contact details.
- `sales_transaction.json` contains the supplied historical sales used to calculate demand.
- `import_data.json` contains the sample sales data available for import.

The JSON files are the static source data. Imports and edits update the browser-local workspace; **Local workspace** restores the supplied baseline.

## How to Run

### Run on Replit

1. Open the Replit project.
2. Click **Run**.
3. Open the StockSync AI web preview.

The supplied datasets load through the project API. No external database or API credentials are needed to run the inventory demo.

### Run locally

Install **Node.js 22.16+ LTS or Node.js 24 LTS** and **pnpm**. From the repository root, run:

```sh
pnpm install
pnpm dev
```

Wait for the terminal to display **StockSync is ready**, then open **http://localhost:3000**. Keep the terminal running while using the app; press **Ctrl+C** to stop it.

Use the root `pnpm dev` command so the frontend and API are both started with the local router. Opening the frontend-only Vite port directly will not route dataset requests correctly.

### Run tests

```sh
pnpm test:local
pnpm --filter @workspace/stocksync-ai test
pnpm --filter @workspace/api-server test
pnpm run typecheck
```

## How We Use Replit

- **Development and preview:** Replit workflows run the web application and API server.
- **Deployment:** Add the public Live Demo URL above after publishing.
- **Credentials:** The inventory demo does not require API credentials. Do not commit secrets to GitHub.
- **Proof of use:** `[Add the organizer-required Replit proof-of-use document if applicable]`

## RunPod

RunPod is not currently used by StockSync AI. The project has no RunPod endpoint configured or called; inventory suggestions are calculated by application rules.

## Challenges and Learnings

- `[Add a challenge the team encountered and how it was addressed.]`
- `[Add a key lesson learned during the project.]`

## Future Improvements

- `[Add a planned improvement.]`
- `[Add another planned improvement.]`

## Team

| Name                     | Role         | GitHub                     |
| ------------------------ | ------------ | -------------------------- |
| Ling Xin Qi              | Team Leader  | `[Add GitHub profile URL]` |
| `[Add team member name]` | `[Add role]` | `[Add GitHub profile URL]` |
| `[Add team member name]` | `[Add role]` | `[Add GitHub profile URL]` |

## Submission Checklist

- [x] Team name, domain, SDG track, team leader, university, and member count included
- [ ] GitHub, Replit, Live Demo, and Pitching Demo links added
- [ ] Replit proof-of-use document added if required
- [ ] Challenges, learnings, and team member details completed
- [x] How-to-run steps checked against the project scripts
- [x] No API keys or secrets included in this README

## License

This project is licensed under the [Apache License 2.0](LICENSE).
