---
name: Account data boundaries
description: Why anonymous demo data must not be automatically assigned to authenticated accounts.
---

Leave the legacy anonymous browser workspace untouched rather than automatically importing it into an authenticated account.

**Why:** A browser may be shared, and signing in does not establish ownership of earlier anonymous inventory, approvals, or activity. Account authentication was added to the portable demo, not as a migration to shared production storage.

**How to apply:** If migration is requested later, offer an explicit ownership-confirmed import rather than silently claiming the anonymous records. Keep browser-local demo state separate between accounts and make clear that authentication alone does not make procurement records server-authorized, shared, or immutable.
