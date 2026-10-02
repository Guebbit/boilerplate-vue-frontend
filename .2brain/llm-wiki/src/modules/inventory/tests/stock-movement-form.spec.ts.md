---
source: src/modules/inventory/tests/stock-movement-form.spec.ts
sha256: fd47ef85e7b2b6388facc26d828db250b8366ee7115597e6d1bef8041dcc18de
generated_at: 2026-10-02T15:10:23.110643+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/stock-movement-form.spec.ts

## Purpose

Vitest suite that mounts the real `StockMovementForm` component twice — once per `mode` prop (`receipt`, `adjust`) — to prove the two validation branches diverge as designed: receipt rejects non-positive and fractional quantities, adjust rejects zero and fractional deltas but passes a negative delta through signed.

## Key elements

- **`mountForm(mode)`** – Seeds one product (`p1`, "Widget") into the products store, then mounts `StockMovementForm` with Vuetify + i18n plugins and a `VAutocomplete` stub.
- **`submitAmount(wrapper, amount, dataTestPrefix)`** – Shared helper that sets the product select, types the amount into the mode-specific input (`receipt-quantity` or `adjust-delta`), and triggers `form` submit. Returns a promise chain.
- **`V_AUTOCOMPLETE_STUB`** – Minimal native-`<select>` component (one `<option>` for `p1`) that stands in for Vuetify's teleported `v-autocomplete`, keeping the product field fillable via `setValue`.
- **`vi.mock('@api', …)`** – Partial mock that replaces `searchProducts` with an immediately-resolving empty result, preventing a lingering debounced network call after tests finish.
- **`describe('the receipt form')`** – Two tests: non-positive quantity is refused (error text + `receive` not called); fractional quantity is refused.
- **`describe('the adjustment form')`** – Three tests: zero delta refused; fractional delta refused; negative delta (`-3`) passed through to `inventory.adjust('p1', -3, undefined)`.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level before any test runs, wiring test doubles into the app's module system so the component's internal imports resolve to controlled implementations.

## Notes

- All submit assertions use promise chains (`.then()`) rather than `await`; the `submitAmount` helper returns a `Promise`, and tests `.then()` off of it.
- The `data-test` attribute names are mode-specific (`receipt-product` / `adjust-product`, `receipt-quantity` / `adjust-delta`); the helper branches on the prefix string to pick the correct amount input selector.
- The negative-delta test additionally mocks `inventory.adjust` (so it resolves) and `products.fetchProducts` to avoid side-effect noise; the other tests rely on the schema rejecting before the store method is reached.
- `beforeEach` creates a fresh Pinia and loads the `en` locale per test — the i18n setup is required because the component renders translated error strings that assertions match against.
