---
source: src/modules/users/tests/users-list-view.spec.ts
sha256: c36129e8dc480677a572686ddebff3694ab98dce799b657e1c108300a13a2af3
signature: 4eff0683eb3399dc812159f6ff6571410bb15ae73884d356494225aeecd8374a
generated_at: 2026-11-10T06:10:06.728791+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/users-list-view.spec.ts

## Purpose

Page-level integration spec for `UsersList.vue`. Verifies that header clicks drive server-side sorting (via `filters.sort` + a fresh `searchUsers` call), that the purchase-hold and needs-review filters are submitted correctly and render the corresponding row badges, and that per-row action buttons reflect the server-supplied `actions` payload rather than a global session permission.

## Key elements

- **`mountWithRows(items?)`** — Mounts `UsersList` against a mocked one-row `SearchUsersResponse`; returns the wrapper after the initial search resolves.
- **`headOf(wrapper, title)`** — Locates a `<th>` by visible text for triggering sort clicks.
- **`wireModulesIntoCore()`** — Called once at module scope to register enabled-module routes on the memory router.
- **`vi.mock('@api')`** — Replaces only `searchUsers` with a spy; all other API exports are preserved via `importOriginal`.
- **`describe('…sorting from the header')`** — Asserts `filters.sort` value and `searchUsers` call shape after clicking sortable columns; confirms non-sortable columns lack the Vuetify `v-data-table__th--sortable` class.
- **`describe('…the purchase-hold filter')`** — Submits the form with `purchaseHold: true`, checks the API param, and asserts the `row-purchase-hold` badge appears only for users with an active hold.
- **`describe('…the needs-review filter')`** — Same pattern for `purchaseHoldReview`; asserts the `row-needs-review` badge is independent of an active hold.
- **`describe('…the row actions follow each row's own actions')`** — Verifies the set of `row-*` buttons per row matches the server's `actions` object; covers restore-vs-delete, the owner-requested-erasure confirmation dialog, and the no-prompt admin soft-delete restore.
- **`scheduledRow()`** — Fixture builder for a soft-deleted, owner-purge-scheduled account used in the restore-flow tests.

## Relationships

- **`src/modules/users/views/UsersList.vue`** — The component under test; mounted directly with router, Vuetify, and i18n plugins.
- **`src/modules/users/store.ts`** — The Pinia store under test; the spec reads its filter state for assertions and spies on `restoreUser`.
- **`contracts/rest/index.ts`** — Source of the `searchUsers` function (mocked) and the `@api/schemas` module (imported to validate response shapes via `contractResponse`).
- **`tests/support/unit/orval-fixture-schema.ts`** — `contractResponse` produces schema-valid API response objects for the mock.
- **`tests/support/stub.ts`** — `asStub` casts the constructed response to satisfy the typed API return.
- **`tests/support/unit/fixtures.ts`** — `aUser`, `ALL_USER_ACTIONS`, `NO_USER_ACTIONS`, `userActionsOf` provide user and action-permission fixtures.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` populates the router with all enabled modules' routes before the tests run.

## Notes

- The sort tests are explicitly documented as mirroring the orders list's "sorting from the header" suite; the sorting logic itself lives in `useServerSort`, not in this component.
- Row actions are **per-row** (each user's `actions` field decides what this admin can do on that account), not a global session permission. The tests enforce this by asserting different button sets across rows in the same table.
- A `purchaseHoldReview` flag can be present without an active `purchaseHold`; the tests verify the two badges are independent.
- The owner-requested-erasure flow uses `useDialogStore().confirm` as a spy; declining must not call `restoreUser`.
