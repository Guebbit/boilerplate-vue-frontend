---
source: src/modules/users/tests/users-list-view.spec.ts
sha256: a9cff7140bd9a1edccb60d00fa12e2b33d4b211cb9c246bdf5d1dfc8d0c1545d
generated_at: 2026-10-17T01:49:11.442128+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/users-list-view.spec.ts

## Purpose

Page-level spec for the `UsersList` view. It verifies two behaviours end-to-end: (1) clicking a table header triggers a **server-side** sort (the column name is sent as `filters.sort` and the search restarts from page 1) and API-unsortable columns stay inert; (2) the per-row action buttons are driven by the server's per-row `actions` object rather than the current user's global role. The suite shares its template with the equivalent "sorting from the header" tests in the orders list module.

## Key elements

- **`mountWithRows(items?)`** – Mocks `searchUsers` to return a single-page `SearchUsersResponse` (via `contractResponse` + `asStub`), mounts `UsersList` with router/vuetify/i18n plugins, and waits for the first search to settle. Returns the `Wrapper`.
- **`headOf(wrapper, title)`** – Finds a `<th>` element whose visible text contains `title`; used to trigger clicks or inspect sortable classes.
- **`describe('UsersList — sorting from the header')`** – Three tests: single-click sets `sort: ['column']`, double-click toggles to `'-column'`, and non-sortable columns (Role, Active) lack the `v-data-table__th--sortable` class.
- **`describe('UsersList — the row actions follow each row's own actions')`** – Three tests asserting which `data-test="row-*"` buttons appear per row based on the `actions` flags (`update`, `ban`, `delete`) returned by the API.
- **`vi.mock('@api')`** – Partially mocks the `@api` barrel, replacing only `searchUsers` with `vi.fn()`.

## Relationships

- **`src/modules/users/views/UsersList.vue`** – The component under test; mounted directly.
- **`src/modules/users/store.ts`** – `useUsersStore()` is read to assert `filters.sort` after a header click.
- **`contracts/rest/index.ts`** (via `@api/schemas`) – `schemas.SearchUsersResponse` and the `contractResponse` helper shape the mocked API payload so it matches the real OpenAPI contract.
- **`tests/support/unit/fixtures.ts`** – `aUser()` factory produces fixture rows (with overridable `actions`).
- **`tests/support/stub.ts`** – `asStub` wraps the contract-shaped object into the runtime shape the component expects.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers module routes/providers into the kernel so the page resolves its dependencies.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – `contractResponse` builds a contract-valid response body from the schema and a partial data object.

## Notes

- Sorting is **server-side** (`useServerSort` composable handles the plumbing); the test only asserts the outgoing `sort` parameter and the store value, not any client-side re-ordering.
- The "inert column" test checks Vuetify's internal class `v-data-table__th--sortable`, tying the assertion to a Vuetify implementation detail rather than a public API.
- Row-action buttons are identified by `data-test` attributes (`row-edit`, `row-access`, `row-delete`, `row-hard-delete`, `row-view`); the test assumes `row-access` is present whenever the row allows any write action, and `row-view` is always present.
- The suite calls `wireModulesIntoCore()` at module top-level (side-effect), not inside a `beforeEach`; the real app router is rebuilt per test file via `createMemoryHistory`.
