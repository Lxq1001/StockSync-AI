---
name: Account data boundaries
description: Why anonymous demo data must not be automatically assigned to authenticated accounts.
---

Do not automatically import an anonymous browser workspace into an authenticated account.

Authentication was subsequently removed at the user's request. The same boundary applies in reverse: do not import account-specific browser data into the now-public demo.

**Why:** A browser may be shared, and signing in does not establish ownership of earlier anonymous inventory, approvals, or activity. Account authentication was added to the portable demo, not as a migration to shared production storage.

**How to apply:** If migration is requested later, offer an explicit ownership-confirmed import rather than silently claiming the anonymous records. Keep browser-local demo state separate between accounts and make clear that authentication alone does not make procurement records server-authorized, shared, or immutable.

The user later explicitly authorized retiring the old anonymous sample stores in favor of supplied datasets; see [Supplied datasets only](dataset-source-policy.md). This does not authorize reading, importing, or deleting account-specific stores.
