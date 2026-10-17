---
source: src/modules/delivery/tests/shipping-selector.spec.ts
sha256: c2876cfa6d8642e9958a5ab596775796ae2b919396a416e064738d428bdafdaf
generated_at: 2026-10-17T00:50:11.910881+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/shipping-selector.spec.ts

## Purpose

Vitest spec for `ShippingSelector.vue` that verifies the component's own scoped contract: it renders exactly the priced options it is given (never re-derives pricing), fetches the shared methods list once on mount (to power the ship-to list and the free-above hint), and correctly distinguishes a threshold-crossed "free" from an always-free method.

## Key elements

- **`OPTIONS`** — Two fixture entries (`standard` at €5, `pickup` at €0) shaped like the cart's `shipping.options` payload.
- **`mountSelector(options?)`** — Helper that activates a fresh Pinia store, mocks `store.fetchMethods`, and mounts the component with `vuetify` + `i18n` plugins. Returns `{ store, wrapper }`.
- **`beforeEach`** — Resets Pinia and loads the `en` locale before every test.
- **Test: fetches once on mount** — Asserts `fetchMethods` is called exactly one time.
- **Test: fetches even when `store.methods` is already populated** — Pre-fills the store to document that a "skip if non-empty" guard would be a bug (another page may have populated the list in a different context).
- **Test: renders one radio per option, priced exactly as given** — Asserts displayed text contains `formatCurrency` output matching the prop value.
- **Test: offers only the options given** — Passes a single-option array and asserts the other radio does not exist.
- **Test: free-earned hint only on real threshold** — Populates `store.methods` with `freeAbove: 100` on `standard` and asserts the i18n `shipping-selector.free-earned` string appears for `standard` but not for always-free `pickup`.

## Relationships

- **`src/modules/delivery/components/ShippingSelector.vue`** — The component under test; mounted via `@vue/test-utils` with `options` and `currency` props.
- **`src/modules/delivery/store.ts`** — Provides `useDeliveryStore`; the spec spies on `store.fetchMethods` and reads/writes `store.methods` to exercise the free-above hint logic.

## Notes

- The component is **never** passed `itemsTotal` — pricing is the caller's (server's) responsibility; the spec intentionally omits it to lock that boundary.
- `freeAbove` does **not** exist on the `options` prop; the component cross-references the unfiltered `store.methods` catalogue to determine whether a zero price is threshold-crossed or inherent. Tests must therefore populate `store.methods` separately from the `options` prop.
- DOM assertions rely on `data-test=shipping-method-{id}` attributes, not structural selectors.
- The "fetches even when populated" test encodes a deliberate non-optimization: the fetch on mount is unconditional by design, and a future refactor that adds a `if (store.methods.length) return` guard would break this test.
