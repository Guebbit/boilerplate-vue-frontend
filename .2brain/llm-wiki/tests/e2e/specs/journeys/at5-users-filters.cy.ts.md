---
source: tests/e2e/specs/journeys/at5-users-filters.cy.ts
sha256: a2989c5e115d48646d279099b1a16fe34dbe33f8f694dfac243e2f8541bc03cb
generated_at: 2026-10-17T02:08:15.571652+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-users-filters.cy.ts

## Purpose

Cypress e2e journey test that verifies every filter control on the **Users** list page (email, id, active/inactive, free-text, and deleted) correctly narrows the visible rows to matching users, and that **Reset** restores the full unfiltered list. It uses the seeded customer account and the banned `marcus` account as known witnesses to assert positive and negative matches.

## Key elements

- **`UserLike`** – minimal local interface (`{ id: string }`) describing the slice of a user the test reads from the API response.
- **`describe('AT5 · Users list filters', …)`** – the single top-level suite.
  - **`beforeEach`** – visits `/en`, restores seed data, logs in as `admin`, enables network tracking, navigates to `/en/users`, and settles pending requests.
  - **`it('email, active, deleted and text narrow the list, and reset restores it', …)`** – one long, sequentially chained test that:
    1. Fetches the seeded customer's email via `cy.accountOf('user')` and resolves their id through a `POST /users/search` API call.
    2. Asserts each filter (email → id → active/inactive → text → deleted) by typing/selecting in the corresponding `[data-test=filter-*]` control, calling `submitSearch()`, and checking `listedIds()` against expected values.
    3. Calls `resetSearch()` after every assertion and confirms the full list is restored.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports and uses three helpers:
  - `submitSearch()` – triggers the form submission for the currently active filter.
  - `resetSearch()` – clears all filters and re-fetches the default list.
  - `listedIds()` – returns a Cypress chain of the `id` values currently rendered in the user list, used with `.should('deep.equal', …)` / `.should('include', …)` assertions.

## Notes

- The test is deliberately a **single `it`** with sequential `cy.step()` markers rather than multiple independent tests; each filter check depends on the prior `resetSearch()` call, so they cannot run in isolation.
- The "Inactive" sub-step verifies the banned user is present but cannot assert *which* row it is (page is 10 rows); the test then cross-checks with the id filter set to "Active" vs. "Inactive" to disambiguate.
- The "deleted" step asserts zero `[data-test=row-deleted]` elements because the seed data contains no soft-deleted users.
- The file header declares `// requires-module: account, users`, meaning the test infrastructure must have both the `account` and `users` modules registered (likely for seed/data provisioning).
- `cy.settleNetwork()` in `beforeEach` is a project-level helper (not from `steps.ts`) that waits for outstanding XHRs before assertions begin.
