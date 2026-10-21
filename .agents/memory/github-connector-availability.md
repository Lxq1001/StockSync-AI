---
name: GitHub connector availability
description: A local Replit GitHub attachment may report success without exposing a callable source-control connection.
---

**Rule:** Before repository creation or push work, verify that `listConnections("github-source-control")` returns a connection and that a read-only GitHub API request succeeds. If no connection is exposed, continue with a manual source export rather than assuming authorization is usable.

**Why:** On October 21, 2026, GitHub integration search showed an authorized attachment route and `addIntegration` returned success, but `listConnections` stayed empty and the workspace GitHub CLI was unauthenticated.

**How to apply:** If the user says GitHub is connected, retry the documented attach flow once, then validate callable access. Do not request or handle a personal access token as a workaround.
