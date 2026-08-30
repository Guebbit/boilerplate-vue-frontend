---
tags:
  - 2repo
  - 2repo/module
  - project/boilerplate-vue-frontend
type: module
module: src/modules/delivery/
files: 7
updated: 2026-08-30T17:10:03.552140+00:00
---

# src/modules/delivery/

## Purpose

The delivery module encapsulates the shipping domain of the application: selecting a shipping method at checkout (with live pricing and free-threshold feedback) and displaying shipment status for an in-progress order. It is a component-only module—no routes of its own—consumed by the cart and orders flows.

## Key parts

- **Components** (`components/`)
  - `ShippingSelector.vue` — radio-group UI for the delivery step; reads methods from the store, shows each method's effective price for the current basket so the "free above X" threshold is visible in real time.
  - `ShipmentPanel.vue` — compact status card (tracking code + status chip) for a single order; includes an admin-only "advance courier" button that stands in for a backend timer while the parcel is in transit.

- **State & data layer**
  - `store.ts` — Pinia setup store (`useDeliveryStore`) holding available shipping methods and the current shipment; wraps every backend call in the toolkit's shared loading tracker.
  - `response-schemas.ts` — Zod-style response-envelope schemas for every delivery endpoint; the HTTP layer validates payloads against these before data reaches application code.

- **Module plumbing**
  - `index.ts` — barrel that exports exactly the two components; the store is intentionally *not* re-exported so consumers go through the components' internal fetch logic.
  - `module.ts` — kernel manifest that registers the schemas and locale dictionaries but defines **no** routes.

- **Tests**
  - `tests/store.spec.ts` — Vitest spec that transport-mocks the HTTP layer to verify the store API surface, the `effectivePrice` free-above rule, and the 404-vs-other-error distinction on shipment reads.

## How it connects

The dependency graph declares no outgoing or incoming module dependencies for this package. In practice, the cart and orders modules import `ShippingSelector` and `ShipmentPanel` from the `index.ts` barrel and embed them in their own pages; they do not touch the store or schemas directly.

## Where to start

1. **`store.ts`** — reading the Pinia store first gives you the shape of the delivery domain (methods, shipment, `effectivePrice` rule) and the set of backend calls the components make.
2. **`components/ShippingSelector.vue`** — the component that actually *uses* that store for the user-facing checkout step; it shows how the free-threshold pricing and method selection are wired together in a single SFC.

## Connected modules
_(none)_

## Files
- `src/modules/delivery/components/ShipmentPanel.vue` — A small Vue 3 SFC that renders the shipping status (tracking code + status chip) for a single order. When the viewer is an admin and the parcel is still in transit, it also exposes a button that manually advances the courier, serving as the repo's substitute for a backend timer.
- `src/modules/delivery/components/ShippingSelector.vue` — Renders the shipping-method radio group for the delivery step. It reads the list of methods from the delivery store, lets the user pick one (or none), and displays each method's effective price for the current basket so the "free above X" threshold is visible while it is being earned.
- `src/modules/delivery/index.ts` — Public barrel for the delivery module. It exposes exactly two Vue components (`ShippingSelector`, `ShipmentPanel`) and nothing else. The module's store is deliberately *not* re-exported here so that consumers must interact with shipping data through the components' own internal fetch logic rather than reaching for a shared store API.
- `src/modules/delivery/module.ts` — App-module manifest for the `delivery` module. It registers the module's response schemas and locale dictionaries with the kernel registry without defining any routes — shipping (methods, parcels) is exposed as components consumed by the cart and orders modules, not as standalone pages.
- `src/modules/delivery/response-schemas.ts` — Declares the response-envelope schemas for every delivery endpoint this module's client functions call. The list is consumed by the HTTP layer to validate each response against the expected shape before it reaches application code.
- `src/modules/delivery/store.ts` — Pinia setup store (`useDeliveryStore`) that holds the delivery domain state — the shop's available shipping methods and the current order's shipment — and wraps each backend call in the toolkit's shared loading tracker. It exists so Vue components can read/write delivery state reactively without duplicating fetch or loading logic.
- `src/modules/delivery/tests/store.spec.ts` — Vitest spec for the delivery Pinia store. It transport-mocks the HTTP layer (same pattern as the wishlist spec) to verify the store's API surface, the `effectivePrice` free-above display rule, and the critical 404-vs-other-error distinction on shipment reads.

---
[[boilerplate-vue-frontend_INDEX|← boilerplate-vue-frontend index]]
