---
source: src/modules/users/tests/e2e/roles.cy.ts
sha256: 256a34a73fc438b89c795a8d35d332a459f1ec7f2cdae45e506ff40e3af0e641
signature: 256a34a73fc438b89c795a8d35d332a459f1ec7f2cdae45e506ff40e3af0e641
generated_at: 2026-11-10T06:05:43.887104+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/e2e/roles.cy.ts

## Purpose

Declares the role-sweep case list for the users module. Each case pairs a user route with the permissions (`can`) that a persona must hold to view the page, so the browser's rendering is checked against the permission model. The file is co-located under `src/modules/users/` so that deleting the module removes its sweep automatically.

## Key elements

- **`sweepRoles('users', [...])`** — single top-level call. The first argument is the module label; the second is the array of route/permission cases the sweeper iterates over.
- **`users list`** case — static route `/en/users`, requires `read User`, anchors to `#users-list-page`.
- **`a user page`** case — dynamic route built from `cy.accountInRole('unverified')` to obtain a user id; requires `read User`; anchors to the page `h1`.
- **`user create`** case — static route `/en/users/create`, requires `create User`, anchors to `#user-create-page`.
- **`user edit`** case — dynamic route (same `accountInRole` lookup) appended with `/edit`; requires `update User`, anchors to `#user-edit-page`.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides the `sweepRoles` helper that this file imports and calls. That helper is responsible for iterating over the provided case list, resolving dynamic routes, logging in as each persona, and asserting that the page (identified by `pageRoot`) renders only when the persona satisfies the `can` tuple.

## Notes

- Routes that need a real user id are expressed as a **function returning a Cypress promise** (`() => cy.accountInRole('unverified').then(...)`). The sweeper calls the function at runtime; do not inline the string directly.
- The `can` array encodes `[verb, subject]` (e.g. `['read', 'User']`). The sweeper interprets it against the persona's permission set—no extra logic lives in this file.
- `pageRoot` is a CSS selector used by the sweeper to confirm the correct page actually loaded before asserting visibility.
