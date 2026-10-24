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

### Option 1 — Run on Replit

Open the project's Replit workspace.

Make sure the required dependencies and environment variables are configured.

Use the project's configured Run command.

Open the application preview to interact with StockSync AI.

Replit Project: [Add your Replit project URL]

Confirm the actual Replit setup and run command before submitting these instructions.

### Option 2 — Run Locally

Make sure Node.js and pnpm are installed, then run the following commands from the project directory:

```powershell
# 1. Install project dependencies
pnpm install

# 2. If it shows an error, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Then continue with:
pnpm install

# 3. Approve dependency build scripts
pnpm approve-builds
# Press <space> to select, <enter> to confirm, then "y" to confirm.

# 4. Start the development server
pnpm dev
```

Open the local address shown in the terminal. The development application is expected to be available at **http://localhost:3000**.

## How We Use Replit

- **Development and preview:** Replit workflows run the web application and API server.
- **Deployment:** Add the public Live Demo URL above after publishing.
- **Credentials:** The inventory demo does not require API credentials. Do not commit secrets to GitHub.
- **Proof of use:** `[Add the organizer-required Replit proof-of-use document if applicable]`

## RunPod

RunPod is not currently used by StockSync AI. The project has no RunPod endpoint configured or called; inventory suggestions are calculated by application rules.

## Challenges & Learnings

- Inventory data handling: Working with inventory and sales data highlighted the importance of keeping information organised and usable.
- Workflow integration: Connecting inventory monitoring, restocking suggestions and supplier communication helped us understand how different steps can be brought together in one application.
- User-centred design: We learned the importance of presenting stock information and recommendations clearly so users can review them before taking action.
- Testing and reliability: We learned that application workflows, configuration and external integrations need to be tested before deployment.

## Future Improvements

- **Improve Data Accuracy:** Ensure inventory and sales data are accurate, complete, and up to date to generate more reliable restocking recommendations.
- **Adapt to Demand and Supply Changes:** Improve the system’s ability to account for unexpected changes in customer demand, supplier delays, and stock availability.
- **Automate Supplier Communication Tracking:** Integrate email monitoring to detect supplier replies and negotiation outcomes, enabling purchase order statuses to be updated automatically where appropriate.
- **Enhance Order Status Management:** Reduce manual updates by linking supplier communications with purchase order status tracking.
- **Improve Data Persistence and Scalability:** Consider replacing local JSON files with a suitable database to support more reliable data storage, concurrent access, and future growth.
- **Strengthen End-to-End Automation:** Further streamline the restocking and supplier ordering process while maintaining human review and approval where necessary.

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
