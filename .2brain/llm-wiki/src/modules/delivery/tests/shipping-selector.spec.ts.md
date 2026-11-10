---
source: src/modules/delivery/tests/shipping-selector.spec.ts
sha256: 3820aa20b500a7aeb1935e2e28423d7da0d541634c92ce89b726877f73c518f4
signature: 26db174434220ac8389b906d48f477e7f2ebf270722ba8ae36e0a8aefb0d1b10
generated_at: 2026-11-10T04:21:10.040851+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/shipping-selector.spec.ts

## Purpose

Unit tests for `ShippingSelector.vue`, scoped to the component's own responsibilities: rendering one radio per caller-provided `options` entry (already priced, never re-derived) and fetching the shared unfiltered methods list exactly once on mount. Fetch-internal logic is deliberately out of scope (lives in `delivery/tests/store.spec.ts`).

## Key elements

- **`OPTIONS`** — fixture of two already-priced shipping options (`standard`, `pickup`) matching the shape of `shipping.options` the cart passes down.
- **`mountSelector(options?)`** — helper that creates a fresh Pinia, mocks `store.fetchMethods`, and mounts the component with Vuetify + i18n plugins. Returns `{ store, wrapper }`.
- **`describe('ShippingSelector')`** — five tests:
  - Fetches `store.fetchMethods` exactly once on mount.
  - Still fetches on mount even when the shared methods list is already non-empty (stale-cache regression guard).
  - Renders one `[data-test=shipping-method-*]` radio per option, displaying `formatCurrency` of the given price.
  - Renders *only* the options passed as props; the store's wider catalogue never leaks in.
  - Shows the "free-earned" hint on a method only when its unfiltered catalogue entry has a `freeAbove` threshold that was actually crossed — an always-free method (`pickup`) never gets the hint.

## Relationships

- **`src/modules/delivery/components/ShippingSelector.vue`** — the component under test; mounted via `@vue/test-utils` and queried for radio inputs and hint text.
- **`src/modules/delivery/store.ts`** — provides `useDeliveryStore`; its `fetchMethods` action is spied/mocked in every test, and the `methods` array is populated manually to drive the free-above hint assertions.

## Notes

- `itemsTotal` is never passed as a prop; pricing is always the caller's pre-computed value. This is a contract the tests enforce.
- The "fetch even when already populated" test exists specifically to prevent a guard that skips the fetch when the shared methods list is non-empty, which would let the cart trust a list fetched by another page in a different context.
- The free-earned hint test cross-references the **unfiltered** catalogue in the delivery store (where `freeAbove` lives) against the **filtered** `options` prop (which carries only the computed price), because the component has no access to threshold data on the option itself.
