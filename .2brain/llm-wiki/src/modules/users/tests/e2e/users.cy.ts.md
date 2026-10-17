---
source: src/modules/users/tests/e2e/users.cy.ts
sha256: 0163e4026c7e4cd9d7bd4cc49d1d6e2aed521165e1678af2fe7f028cab8f5d65
generated_at: 2026-10-17T01:47:07.688590+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/e2e/users.cy.ts

## Purpose

Cypress functional end-to-end spec for the admin-only Users module. Covers the full CRUD lifecycle — list rendering, create, edit, soft-delete, restore, and hard-delete — against the real running app. Accessibility and visual-regression specs live in separate files; this one is purely functional coverage.

## Key elements

- **`unique()`** — Returns a collision-resistant string (`${Date.now()}-${random}`) so concurrent spec runs against the same backend never share a username.
- **`searchUser(username, deleted)`** — Navigates to `/en/users` via a fresh `cy.visit()`, types the username, picks the deleted-filter option, then clicks submit. The fresh page load is intentional: row actions (`handleDelete`/`handleRestore`) each schedule their own delayed `search(true)` reload, and a same-page filter change can race that reload. A clean visit eliminates the race.
- **`describe('Users')` → `beforeEach`** — Restores DB state (`cy.restore()`), logs in as admin, and visits `/en`. Every spec starts from a known-clean, authenticated session.
- **`describe('Users list')`** — Asserts the page title, row count ≥ 1, and that active rows expose view / edit / access / delete / hard-delete actions while the restore action is absent.
- **`describe('Create')`** — Fills the create form with a unique username/email, submits, and verifies the browser lands on the new user's detail page.
- **`describe('Edit')`** — Creates a user, navigates to `/edit`, confirms the form hydrated with the original value, types a new username, submits, asserts the success toast, then reloads and re-checks the input to prove the change persisted.
- **`describe('Delete, restore and hard-delete')`** — Creates a user, then exercises the full lifecycle: soft-delete (confirm dialog → toast → fresh search shows `row-deleted` badge), verify "Not deleted" filter hides it, restore (fresh search shows badge gone and `row-delete` back), and finally hard-delete (confirm → toast → fresh search shows the row absent).

## Relationships

No dependency-graph neighbors.

## Notes

- **Fresh `cy.visit()` after every row action** — `searchUser` is called again after each delete/restore click specifically to avoid racing the action's own scheduled `search(true)` reload. Re-using the current page's search input is deliberately avoided.
- **Deleted-filter semantics vs. row state** — The restore verification reads the row's own DOM state (`row-deleted` badge gone, `row-restore` absent, `row-delete` present) rather than the "Not deleted" filter, because the filter's `deletedAt: null` contract is a search-endpoint concern, not what this test is asserting.
- **Admin-only** — The `beforeEach` logs in as `admin`; these specs will fail if the module's auth guard changes or if a non-admin role is used.
- **`data-test` attributes** are the sole selector contract; no CSS class or text-content selectors are relied upon for identification.
- **`cy.restore()`** is a custom command (not built-in Cypress) that resets the backend to a known fixture state before each test.
