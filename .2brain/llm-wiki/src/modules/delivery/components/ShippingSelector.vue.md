---
source: src/modules/delivery/components/ShippingSelector.vue
sha256: 0ad0f9fce8f5a7518e8c73450c037b38a04edc5b645b38fa4e5a124e6b151009
generated_at: 2026-10-17T00:47:36.019262+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShippingSelector.vue

## Purpose

Renders a radio group of shipping methods for a cart. Each radio corresponds to one already-priced `CartShippingOption` supplied by the caller; the component never re-derives prices. It also mirrors `requiresAddress` and `shipToCountries` outward via `defineModel` so the parent (`Cart.vue`) can gate the address form and narrow country selection without importing the delivery store directly.

## Key elements

- **`options` / `currency` props** – The caller's server-priced, basket-fitting shipping list and the shop's currency code used for display formatting.
- **`methodId` (model)** – The currently selected method id, or `undefined` (no shipping method required to proceed to checkout).
- **`requiresAddress` (model, `'requiresAddress'`)** – Boolean mirroring whether the chosen option needs a shipping address; kept in sync by a watcher on `[methodId, options]`.
- **`shipToCountries` (model, `'shipToCountries'`)** – Mirrors the delivery store's ship-to country list out to the caller.
- **`freeAboveOf(id)`** – Looks up an option's `freeAbove` threshold in the store's unfiltered catalogue; used to display a "free earned" hint when price is 0 *and* a threshold exists (distinguishes from always-free methods like `pickup`).
- **`onMounted` → `deliveryStore.fetchMethods()`** – Fetches the full method catalogue so `freeAboveOf` and `shipToCountries` have data; the radios themselves render straight off `options` and do not depend on this fetch.
- **Template** – `<v-radio-group>` bound to `methodId`; each `<v-radio>` shows the i18n label, formatted price, and optional "free earned" badge.

## Relationships

- **`src/modules/delivery/store.ts`** – Imported as `useDeliveryStore`; provides `methods` (for `freeAbove` lookups) and `shipToCountries` (mirrored outward). The component does **not** publish the store; it only reads from it.
- **`src/modules/delivery/index.ts`** – Module barrel; expected to re-export this component (and the store) for consumers of the delivery module.
- **`src/modules/delivery/tests/shipping-selector.spec.ts`** – Unit tests for this component's rendering, model sync, and `freeAboveOf` logic.

## Notes

- The component intentionally does **not** compute or re-price anything. `options` is the single source of truth for fit and price; the store is consulted only for display-only metadata (`freeAbove`, `shipToCountries`) that the server's option list omits.
- `requiresAddress` and `shipToCountries` exist as `defineModel` mirrors specifically so `Cart.vue` avoids a direct `useDeliveryStore` import—a deliberate boundary the store does not otherwise expose to the cart module.
- Selecting no method (`methodId === undefined`) is a valid state; the watcher sets `requiresAddress` to `undefined`, and the parent is expected to treat that as "no address needed."
- The "free earned" badge appears only when *both* `freeAbove` is defined **and** the current price is 0—preventing a misleading label on methods that are always free (e.g. `pickup`).
