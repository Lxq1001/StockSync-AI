---
name: Local versus hosted routing
description: Why the downloaded project needs same-origin frontend/API routing independently of Replit.
---

Preserve the same-origin `/api` contract in both hosted and standalone development. Do not assume Replit's path router exists in a user's VS Code environment.

**Why:** Running only the downloaded frontend returned the SPA's HTML for a dataset request, producing an “Unexpected token `<`” error and an empty workspace. Missing local routing must not be disguised by restoring the retired sample dataset.

**How to apply:** Keep a cross-platform local entry point that starts both services and routes API requests separately from frontend pages. Check response content types and validate the user's complete entry-point URL, not merely whether the API works on its own port. Avoid shell-specific startup commands and frontend hardcoded backend hosts.

Package-manager entry points are not necessarily JavaScript: standalone Windows pnpm exposes a native `.exe` through `npm_execpath`.

**Why:** Assuming that every pnpm installation can be invoked through Node passed a local Linux startup check but failed on the user's standalone Windows installation with an unknown `.exe` extension.

**How to apply:** Invoke native executables directly and JavaScript entry points through Node. Preserve executable paths and arguments separately, including paths with spaces, and cover both installation types in launcher regression checks. Linux verification alone does not establish native Windows compatibility.
