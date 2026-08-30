# src/modules/delivery/components/ShippingSelector.vue

## Purpose

Renders the shipping-method radio group for the delivery step. It reads the list of methods from the delivery store, lets the user pick one (or none), and displays each method's effective price for the current basket so the "free above X" threshold is visible while it is being earned.

## Key elements

- **`defineModel<string | undefined>()`** — two-way binding for the selected shipping-method id; `undefined` means "no method chosen" and is a valid state.
- **`itemsTotal: number` (prop)** — the cart's lines total, passed in so the store can compute per-method pricing against the free-above thresholds.
- **`onMounted` guard** — if `methods` is still empty the component calls `deliveryStore.fetchMethods()`; otherwise it assumes the data is already loaded.
- **`deliveryStore.effectivePrice(method, itemsTotal)`** — called in the template to display each option's price; the component performs no pricing math itself.
- **`formatCurrency`** (from `@/infrastructure/utils/formatters.ts`) — formats the numeric price for display.
- **`useId()` / `aria-labelledby`** — the `<h3>` heading serves as the accessible label for the whole radio group.
- **`data-test` attributes** — `shipping-selector` on the root, `shipping-method-{id}` per radio, and `shipping-price` on each price element, for E2E selectors.

## Relationships

- **`src/modules/delivery/store.ts`** — primary data source. The component pulls the reactive `methods` ref via `storeToRefs`, calls `fetchMethods()` on mount when empty, and delegates all pricing logic to `effectivePrice(method, itemsTotal)`.
- **`src/modules/delivery/index.ts`** — module barrel; the component is part of the delivery module's public surface (exported/re-exported through this file).

## Notes

- Selecting nothing is intentional: `methodId` is `undefined` by default and the template has no "required" indicator. The downstream checkout must handle the absence of a method id.
- The "free earned" badge (`shipping-selector.free-earned`) appears only when `method.freeAbove !== undefined` **and** the effective price resolves to `0`; methods without a `freeAbove` threshold never show it.
- The component is purely presentational for pricing — any change to threshold logic belongs in the store, not here.
