# StockSync AI

> StockSync AI helps store teams turn recent sales into stock-cover estimates and practical replenishment suggestions.

---

## Team Information

| Field | Details |
| --- | --- |
| **Team Name** | `[Add team name]` |
| **Team Domain** | `[Choose Domain 1 or Domain 2 from the organizer's list]` |
| **SDG Track (1–17)** | `[Add selected SDG track, if applicable]` |
| **Team Leader** | `[Add team leader's name]` |
| **University** | `[Add university name(s)]` |
| **Number of Members** | `[Add number of team members]` |

## Links

| Resource | Link |
| --- | --- |
| GitHub Repository | `[Add repository URL]` |
| Replit Project | `[Add Replit project URL]` |
| Live Demo | `[Not published yet — add the public demo URL after publishing]` |
| RunPod Endpoint | `Not used — no RunPod endpoint is connected` |
| Slide Deck / Pitching Demo | `[Add slide deck or pitching demo URL]` |
| Demo Video | `[Add demo video URL, if separate]` |

---

## Overview

### Problem

Store teams need a clear way to compare available stock with recent sales and spot products that may run low. When sales records and stock checks are handled separately, replenishment needs can be harder to prioritize.

### Solution

StockSync imports sales history, calculates average daily use and estimated stock cover, and highlights items with 7 days or less of cover. It suggests a replenishment quantity equal to 30 days of average use and provides a workflow for preparing purchase-order drafts and tracking their status.

The current demo uses deterministic calculations and rules; it does not call an external AI model or a RunPod endpoint.

### Key Features

- **Sales import** — Import valid sales records from CSV or JSON.
- **Stock-cover monitoring** — See estimated days of stock based on current on-hand quantity and average daily use.
- **Replenishment suggestions** — Review items with estimated cover of 7 days or less and a 30-day suggested quantity.
- **Purchase-order workflow** — Prepare order drafts and track order statuses.
- **Local workspace restore** — Restore the original supplied stock dataset for a fresh demo.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express API |
| Database | No external database for the demo; supplied JSON datasets and browser-local workspace state |
| AI / Compute | Rule-based stock-cover and replenishment calculations; no external model or GPU endpoint |
| Hosting / Dev | Replit |

---

## Project Structure

```text
.
├── artifacts/
│   ├── stocksync-ai/       # React and Vite web application
│   └── api-server/         # API server and supplied JSON datasets
├── lib/                    # Shared workspace libraries
├── scripts/                # Local development and workspace scripts
├── package.json            # Workspace commands
├── pnpm-workspace.yaml
├── .env.example
├── .replit
├── README.md
└── README-draft.md         # Editable hackathon README draft
```

### Architecture

```text
Store team
    │
    ▼
StockSync AI web app (React / Vite)
    ├──► API server (Node.js / Express) ──► supplied JSON datasets
    └──► Browser-local storage ───────────► workspace edits and demo activity
```

---

## How to Run

### Option 1 — Run on Replit (Recommended)

1. Open the Replit project.
2. Click **Run** and open the StockSync AI web preview.

The supplied datasets load without setting up an external database or adding API credentials.

### Option 2 — Run Locally

Install **Node.js 22.16+ LTS or Node.js 24 LTS** and **pnpm**. From the repository root, run:

```bash
pnpm install
pnpm dev
```

Wait for **StockSync is ready**, then open **http://localhost:3000**. Keep the terminal running while using the app.

### Run Tests

```bash
pnpm test:local
pnpm --filter @workspace/stocksync-ai test
pnpm --filter @workspace/api-server test
pnpm run typecheck
```

---

## How We Use Replit *(Required)*

- **Development:** The application is developed and run in the Replit workspace.
- **Preview:** Replit workflows run the web application and API server for development.
- **Hosting:** The project is not currently published. Add the public Live Demo URL above after publishing.
- **Secrets:** The supplied-data demo does not require API credentials. Never commit Replit Secrets to the repository.

📄 Proof of use: `[Add the required Replit proof-of-use document, if applicable]`

## How We Use RunPod *(Required by organizer template)*

**RunPod is not currently used by this project.** There is no RunPod endpoint configured or called by the web app. The current stock suggestions are calculated in the application without RunPod.

Do not list a RunPod endpoint or claim RunPod usage unless the team integrates and verifies an actual endpoint. If RunPod use is mandatory for submission, confirm the requirement with the organizer and complete a real integration before adding proof of use.

📄 Proof of use: `Not available — RunPod is not currently integrated.`

---

## Challenges & Learnings

- `[Add a challenge your team faced and how you addressed it.]`
- `[Add what your team learned.]`

## Future Improvements

- [ ] `[Add a planned improvement.]`
- [ ] `[Add another planned improvement.]`

## Team

| Name | Role | GitHub |
| --- | --- | --- |
| `[Member name]` | `[Role]` | `[GitHub profile URL]` |
| `[Member name]` | `[Role]` | `[GitHub profile URL]` |
| `[Member name]` | `[Role]` | `[GitHub profile URL]` |

---

## Submission Checklist

- [ ] Team name, domain, SDG track, team leader, university, and member count completed
- [ ] GitHub and Replit project links added
- [ ] Live Demo link added after publishing
- [ ] Slide deck / pitching demo and demo video links added
- [ ] Replit proof-of-use requirement checked with the organizer and documented
- [ ] RunPod requirement checked with the organizer; no RunPod integration is currently present
- [ ] Submission documents added if required
- [ ] "How to Run" steps verified
- [ ] No API keys or secrets committed to the repository

## License

This project is licensed under the [Apache License 2.0](LICENSE).
