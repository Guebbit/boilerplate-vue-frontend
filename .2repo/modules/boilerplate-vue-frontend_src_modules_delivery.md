---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/delivery/
files: 7
updated: 2026-09-03T10:58:16.934246+00:00
---

# src/modules/delivery/

## Purpose

The delivery module owns the shop's shipping-domain logic: the catalogue of available shipping methods, the current order's parcel/shipment record, and the two UI components that other pages (cart, orders) embed to let users pick a method and track a shipment. It deliberately defines no routes of its own—it is a building block, not a destination.

## Key parts

- **Components**
  - `components/ShippingSelector.vue` — presentational radio group for choosing a shipping method (or none) against the current basket total; selection is owned by the parent via `v-model`.
  - `components/ShipmentPanel.vue` — shows parcel status + tracking code; for admins viewing an in-transit parcel, offers an "advance courier" button that manually steps the shipment forward (no background cron).

- **State & data contract**
  - `store.ts` — Pinia setup store holding the method catalogue and the current shipment; wraps `@api` calls through the shared `fetchAny` helper so requests participate in the app-wide loading flag.
  - `response-schemas.ts` — response-envelope schemas for every delivery endpoint; consumed by the HTTP validation layer before data reaches application code.

- **Module wiring**
  - `index.ts` — public barrel re-exporting the two components; the sole import point for consumers outside the module.
  - `module.ts` — kernel manifest that registers the module's schemas and locale dictionaries; registers no routes.

- **Tests**
  - `tests/store.spec.ts` — Vitest spec mocking the HTTP layer; verifies method listing, display pricing (free-above rule), shipment read, the 404-as-"nothing shipped yet" convention, and the advance action.

## How it connects

The module declares no outgoing dependencies. Inbound, it is consumed by the **cart** module (which renders `ShippingSelector` during checkout) and the **orders** module (which renders `ShipmentPanel` on the order-detail page). The barrel (`index.ts`) is the only surface those consumers import; everything else stays internal.

## Where to start

1. **`store.ts`** — the single source of truth for what data the module holds and which API calls it makes; reading it first makes both components and the schemas click into place.
2. **`components/ShippingSelector.vue`** — the simplest component; seeing how it reads from the store and exposes a `v-model` gives you the integration pattern the rest of the app uses to embed shipping UI.

## Connected modules
_(none)_

## Files
- `src/modules/delivery/components/ShipmentPanel.vue` — Renders the shipping/tracking section of an order page. It displays the parcel's current status and tracking code, and—when the viewer is an admin and the parcel is still in transit—provides a "advance courier" button that simulates delivery progress (no background cron exists; an operator click is the timer).
- `src/modules/delivery/components/ShippingSelector.vue` — A presentational radio-group component that lets the user pick a shipping method (or none) for the current cart. It renders the methods list from the delivery store, displays each method's effective price against the basket total, and exposes the selection via `v-model` so the parent owns the chosen method id.
- `src/modules/delivery/index.ts` — Public barrel for the delivery module. It exposes exactly two component re-exports and nothing else, serving as the single import point for anything outside the module that needs a shipping UI.
- `src/modules/delivery/module.ts` — App-module manifest for the `delivery` module. It registers the module's response schemas and locale dictionaries with the kernel registry without defining any routes — shipping (methods, parcels) is exposed as components consumed by the cart and orders modules, not as standalone pages.
- `src/modules/delivery/response-schemas.ts` — Declares the response-envelope schemas for every delivery endpoint this module's client functions call. The list is consumed by the HTTP layer to validate each response against the expected shape before it reaches application code.
- `src/modules/delivery/store.ts` — Pinia setup store for the delivery domain. It holds the shop's shipping-method catalogue and the current order's shipment record, and exposes actions that wrap the corresponding `@api` calls through the toolkit's shared `fetchAny` helper so every request participates in the app-wide loading flag.
- `src/modules/delivery/tests/store.spec.ts` — Vitest spec for the delivery Pinia store. It mocks the HTTP layer (`orvalMutator`) and verifies that the store's public surface — method list, display pricing, shipment read, and advance action — behaves per the API contract, with special attention to the 404-as-"nothing shipped yet" convention and the free-above pricing rule.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
