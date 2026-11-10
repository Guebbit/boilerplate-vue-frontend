---
source: tests/e2e/specs/journeys/at5-users-filters.cy.ts
sha256: a2989c5e115d48646d279099b1a16fe34dbe33f8f694dfac243e2f8541bc03cb
signature: 7b7e731a8970ec47606a8ab2d2dfa1ac1ca5a1246ba13b215f04cffb820fb740
generated_at: 2026-11-10T06:52:21.361786+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at5-users-filters.cy.ts

## Purpose

E2E journey test (AT5) that verifies every filter on the Users list page—email, ID, active/inactive, free-text, and deleted—narrows the table to the expected rows, and that "reset" restores the full list. It relies on two seeded users as witnesses: a normal customer (appears under its own email filter) and a banned account named `marcus` (appears only under "Inactive").

## Key elements

- **`UserLike`** – minimal `{ id: string }` shape used to type the API search response.
- **`beforeEach`** – restores the DB, logs in as `admin`, visits `/en/users`, and waits for the network to settle before each test.
- **`it('email, active, deleted and text narrow the list…')`** – the sole test case. It:
  1. Looks up the seeded customer's ID via `cy.apiAs('admin', 'POST', '/users/search', { email })`.
  2. Asserts each filter (email, ID, Active/Inactive, free-text, Deleted-only) in sequence, resetting between them.
  3. Uses the banned `marcus` account implicitly: the "Inactive" filter must return a non-empty list that excludes the customer, while "Active" + the customer's ID returns exactly one row.

## Relationships

- **`tests/support/e2e/steps.ts`** – source of the three helpers imported at the top:
  - `listedIds()` – returns the array of `data-test=list-row` IDs currently visible.
  - `submitSearch()` – clicks the search/apply button on the filter form.
  - `resetSearch()` – clears all filters and restores the unfiltered list.

## Notes

- The `// requires-module: account, users` header comment signals that the seed data in `account` and `users` modules must be present; the test depends on `cy.accountOf('user')` and on `marcus` being in a "banned"/inactive state.
- The free-text filter is expected to match the **local part** of the email (before `@`), not the full address.
- The "Inactive" assertion deliberately checks `have.length.greaterThan 0` rather than looking for a specific ID, because the seeded list is paginated at ten rows and `marcus` is not guaranteed to land on page one.
- The "Deleted only" filter is expected to return **zero** rows in the default seed (no soft-deleted users), which is an intentional negative check.
