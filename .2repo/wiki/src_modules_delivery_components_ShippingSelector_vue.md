# src/modules/delivery/components/ShippingSelector.vue

## Purpose

A presentational radio-group component that lets the user pick a shipping method (or none) for the current cart. It renders the methods list from the delivery store, displays each method's effective price against the basket total, and exposes the selection via `v-model` so the parent owns the chosen method id.

## Key elements

- **`defineModel<string | undefined>()`** — two-way binding for the selected method id; `undefined` means "no method chosen."
- **`itemsTotal` prop** — the cart's lines total, passed in so the free-above threshold comparison works without the component needing a full cart context.
- **`deliveryStore.methods`** (via `storeToRefs`) — the reactive list of available shipping methods rendered as radio options.
- **`deliveryStore.effectivePrice(method, itemsTotal)`** — pricing calculation delegated entirely to the store; the template only formats the result with `formatCurrency`.
- **`onMounted` guard** — if `methods` is still empty, calls `deliveryStore.fetchMethods()` once; otherwise skips the fetch.
- **Template** — a Vuetify `v-radio-group` labelled by a generated `useId` heading; each `v-radio` shows the method's i18n name, its formatted price, and a "free earned" badge when `method.freeAbove` is defined and the effective price is 0.

## Relationships

- **`src/modules/delivery/store.ts`** — Consumes `useDeliveryStore`: reads the reactive `methods` array, calls `effectivePrice()` per method in the template, and invokes `fetchMethods()` on mount when the list is empty. All pricing logic lives there, not in this component.
- **`src/modules/delivery/index.ts`** — Barrel file for the delivery module; re-exports this component so parent modules can import it from the module root.

## Notes

- The component is intentionally pricing-agnostic: it never computes a price itself. If free-above logic changes, update the store's `effectivePrice`, not this file.
- `defineModel` means the parent must supply `v-model` (or `:modelValue` + `@update:modelValue`); there is no internal fallback selection.
- The "free earned" badge appears only when `method.freeAbove` is defined **and** the effective price resolves to 0 — a method with no `freeAbove` field will never show the badge even if its price is 0.
- `data-test` attributes follow the pattern `shipping-method-<id>` and `shipping-price` for E2E selectors.
