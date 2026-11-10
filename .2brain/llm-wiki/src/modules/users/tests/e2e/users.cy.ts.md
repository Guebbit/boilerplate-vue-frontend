---
source: src/modules/users/tests/e2e/users.cy.ts
sha256: 0163e4026c7e4cd9d7bd4cc49d1d6e2aed521165e1678af2fe7f028cab8f5d65
signature: fbdb0b99bbea530da77150694c952cb1ec4e21f3e1136cac8647b4e6bf039732
generated_at: 2026-11-10T06:06:02.817286+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/e2e/users.cy.ts

## Purpose

Cypress end-to-end spec covering the **functional** CRUD lifecycle of the admin-only Users module: list rendering, create, edit, soft-delete, restore, and hard-delete. Accessibility and visual-regression coverage live in separate spec files; this one asserts that each action produces the correct server-side state through real page navigation and form submission.

## Key elements

- **`unique()`** — returns a `Date.now()` + random-suffix string so usernames are collision-free even when two spec runs hit the same backend concurrently.
- **`searchUser(username, deleted)`** — performs a *fresh* `cy.visit('/en/users')`, types the username into the filter input, picks the deleted-filter option, then submits. Always a full page load rather than in-page re-search (see Notes).
- **`describe('Users') > beforeEach`** — visits `/en`, calls `cy.restore()`, and logs in as `admin`.
- **`describe('Users list')`** — asserts the page title, ≥ 1 row, and the presence/absence of per-row action buttons (`row-view`, `row-edit`, `row-access`, `row-delete`, `row-hard-delete`; `row-restore` absent for active rows).
- **`describe('Create')`** — fills the create form, submits, asserts redirect to the detail URL and visibility of the new username.
- **`describe('Edit')`** — creates a user, navigates to its edit page, waits for the form to hydrate (value matches original), changes the username, submits, asserts the success toast, then reloads and re-asserts the new value.
- **`describe('Delete, restore and hard-delete')`** — full lifecycle in one test: soft-delete → verify badge → verify excluded from "Not deleted" filter → restore → verify badge gone & `row-delete` restored → hard-delete → verify row absent after fresh search.

## Relationships

No graph neighbors are recorded for this file. It is a leaf test spec that exercises the application purely through browser automation (page visits and DOM interaction) and does not import any source modules.

## Notes

- **Why `cy.visit` instead of in-page search?** `handleDelete` / `handleRestore` each schedule their own post-action reload (toast → `search(true)`). Interacting with the deleted-filter select immediately after clicking those buttons can put two searches in flight; whichever the store resolves last wins silently. A fresh page load has no background reload to race.
- **Server-side verification:** After delete and restore, the test re-issues `searchUser` and asserts on *row state* (badge presence, which action button is rendered) rather than trusting the toast or an optimistic client-side flag. This guards against a client that fires the toast before the server commit completes.
- **`cy.restore()`** is a project-specific custom command (not standard Cypress) that resets app/backend state before each spec. Its implementation lives outside this file.
- **`data-test` attributes** are the stable selectors this spec depends on; renaming them in the UI breaks this suite.
- The edit test extracts the numeric user ID by parsing the URL string (`url.split('/users/')[1]`) — it is intentionally coupled to the route shape `/en/users/:id/edit`.
