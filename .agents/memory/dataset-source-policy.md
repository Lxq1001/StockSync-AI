---
name: Supplied datasets only
description: User-directed retirement of the old sample database and limits on preserving old browser data.
---

Use only the user's supplied datasets as the catalog and starting sales source. The original hard-coded sample is not an offline fallback or a reset target.

**Why:** The user explicitly requested: “Please delete the old database. We want to use the new datasets only.”

**How to apply:** Remove old sample products, suppliers, and their linked local records rather than appending them to the supplied catalog. Retain valid work linked to supplied products. Clear retired anonymous browser stores only after the cleaned workspace saves successfully. On a dataset-loading error, show an error instead of restoring sample data. Account-specific browser stores remain out of scope and must not be exposed or migrated.
