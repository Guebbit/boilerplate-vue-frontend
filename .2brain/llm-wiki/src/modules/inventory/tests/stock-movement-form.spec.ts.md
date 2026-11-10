---
source: src/modules/inventory/tests/stock-movement-form.spec.ts
sha256: 056d2a7f2579cfe10051f7a95a27104b4ffd11b43e6eb636928274e909133e0f
signature: bfbed1c5d551cbafad1ea8d4d3d96d95ae43e0e7eeae38f29756f9d947954838
generated_at: 2026-11-10T04:36:17.220703+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/stock-movement-form.spec.ts

## Purpose
Component-level test suite for `StockMovementForm.vue` that exercises both `mode` branches (`receipt` and `adjust`) in a single file, verifying that each branch's amount schema rejects invalid input, enforces integer-only values, and — on success — dispatches the correct store action and cache invalidation.

## Key elements
- **`mountForm(mode)`** — helper that mounts `StockMovementForm` with Vuetify, i18n, and a `VAutocomplete` stub; returns the wrapper.
- **`submitAmount(wrapper, amount, dataTestPrefix)`** — shared interaction helper: fills the product field (via the stubbed `<select>`), types the amount into the mode-specific input, and triggers form submit. Returns a promise chain so tests can assert after render.
- **`V_AUTOCOMPLETE_STUB`** — a minimal `<select>` element replacing Vuetify's teleported `v-autocomplete`, keeping product selection drivable through `setValue` without overlay/teleport complexity.
- **`vi.mock('@api')`** — replaces `searchProducts` with an immediate empty resolution to prevent a pending debounced request from outliving the test.
- **`beforeEach`** — resets Pinia and loads the `en` locale so error-message assertions are stable.
- **`describe('the receipt form')`** — three cases: non-positive rejection, fractional rejection (`.int()`), and query invalidation on successful write.
- **`describe('the adjustment form')`** — three cases: zero-delta rejection, fractional rejection, and negative-delta pass-through (asserts the signed value reaches the store, not its absolute value).

## Relationships
- **`StockMovementForm.vue`** — the component under test; the suite mounts it directly and reads DOM assertions against its rendered output.
- **`useInventoryStore`** (from `store.ts`) — spied on (`receive`, `adjust`) to confirm whether the form's submit handler fires the correct action and with what arguments; the store itself is not modified.
- **`wireModulesIntoCore`** (from `tests/support/unit/wire-modules.ts`) — called once at module load to register the inventory module into the Pinia/Vuex core so the store's actions resolve without a full application bootstrap.
- **`queryClient`** — spied on to assert that a successful receipt invalidates the `['products']` query key, ensuring dependent screens refetch.

## Notes
- The form's product field is a search-as-you-type autocomplete in production, but the test replaces it with a static `<select>` carrying a single option (`p1`). This is intentional: the schema under test is the *amount*, not the search UX.
- `submitAmount` uses a promise chain (`.then`) rather than `await` to stay compatible with `@vue/test-utils`' `setValue` returning a promise; tests must `.then` before asserting.
- The `dataTestPrefix` parameter exists because the component emits different `data-test` attributes per mode (`receipt-quantity` vs. `adjust-delta`); the helper branches on it internally.
- The receipt test for query invalidation mocks `receive` to resolve `undefined` so the success path (and the subsequent `invalidateQueries` call) actually executes.
