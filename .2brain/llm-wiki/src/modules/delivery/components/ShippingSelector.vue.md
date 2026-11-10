---
source: src/modules/delivery/components/ShippingSelector.vue
sha256: 5017acc3fc814a9bb3753fe2df292b4af1cc11e1e913f472171616ab5dca365e
signature: 007a37b272999943fb807f0c86f85c614b6cde0c807cd8079ee00ef29e96130d
generated_at: 2026-11-10T04:17:06.167894+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShippingSelector.vue

## Purpose

Renders a radio group for selecting a shipping method. Each radio corresponds to a server-priced, basket-fitting option passed in via props; the component never computes prices itself. It also mirrors two derived values (`requiresAddress`, `shipToCountries`) out to its caller so the parent (`SignedInCart.vue`) need not import the delivery store directly.

## Key elements

- **`options` / `currency` (props)** — the cart's pre-priced, fitting shipping list and the shop currency for display formatting.
- **`methodId` (`defineModel<string | undefined>`)** — the selected method's id; `undefined` means no method chosen (shipping is optional).
- **`requiresAddress` (`defineModel<boolean | undefined>`)** — mirrors whether the currently selected method needs a shipping address; kept in sync by a `watch` on `[methodId, options]`.
- **`shipToCountries` (`defineModel<string[]>`)** — mirrors the delivery store's ship-to list out to the caller for narrowing the address picker's country select.
- **`freeAboveOf(id)`** — looks up a method's `freeAbove` threshold from the unfiltered store catalogue (the prop list doesn't carry it); used to show a "free earned" badge.
- **`onMounted` → `deliveryStore.fetchMethods()`** — populates the store refs needed for `shipToCountries` mirroring and `freeAboveOf`; failures surface via `useAmbientError` toast.
- **Template** — Vuetify `v-radio-group` bound to `methodId`; each label shows the i18n method name, formatted price, and an optional free-earned hint.

## Relationships

- **`src/modules/delivery/store.ts`** — imported as `useDeliveryStore`; the component reads `methods` (for `freeAbove` lookups) and `shipToCountries` (mirrored out), and calls `fetchMethods()` on mount.
- **`src/modules/delivery/index.ts`** — module entry point that exposes this component to the rest of the app.
- **`src/modules/delivery/tests/shipping-selector.spec.ts`** — unit/integration tests targeting this component's radio rendering, model sync, and store interaction.

## Notes

- Prices are **never** derived here; they arrive pre-computed in `options`. The only store-derived data used for display is `freeAbove`, which the prop list intentionally omits.
- The two-model pattern (`requiresAddress`, `shipToCountries`) exists specifically to avoid the caller importing the delivery store — a boundary the `cart` module may not cross.
- The separate `<script>` block declaring `name: 'ShippingSelector'` is required because `<script setup>` cannot set a component name; it's needed for `<KeepAlive>` and DevTools.
- If a method drops out of `options` (stops fitting the basket), the `watch` clears `requiresAddress` the same way `methodId` would become stale.
