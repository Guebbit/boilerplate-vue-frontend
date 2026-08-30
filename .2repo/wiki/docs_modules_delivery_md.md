# docs/modules/delivery.md

## Purpose

Provides shipping functionality as two self-contained, published components (`ShippingSelector`, `ShipmentPanel`) that sibling modules mount into their own screens. It owns no routes, no navigation entries, and no dependencies — it exists solely to expose a component surface and a small Pinia store.

## Key elements

- **`ShippingSelector`** — component mounted by `cart` at checkout; renders shipping method selection and fetches its own data.
- **`ShipmentPanel`** — component mounted by `orders` on order detail; renders parcel/tracking info and fetches its own data.
- **Store `delivery`** (`store.ts`) — state: `methods`, `shipment`; getter: `loading`; actions: `fetchMethods`, `effectivePrice`, `fetchShipmentForOrder`, `advance`.
- **`index.ts`** — public barrel; the only surface a sibling module may import.
- **`module.ts`** — manifest declaring name, response schemas, dependency edges, and locales.
- **`response-schemas.ts`** — Zod envelopes for the 3 endpoints this module calls.
- **API calls (3):** `POST /delivery/advance`, `GET /delivery/methods`, `GET /delivery/order/{id}`.
- **Locales:** `en`, `it` (each loaded as its own chunk).

## Relationships

- **`cart` → delivery** (published-language edge): `cart` mounts `ShippingSelector` at the checkout screen. The edge is declared in `cart`'s manifest, not here. `ShippingSelector` renders and fetches its own shipping data; the `delivery` store is not shared across modules.

## Notes

- This is a **supporting** subdomain (not a differentiator) — intentionally kept plain.
- Both published components are self-contained: they fetch their own data and own their own state. The mounting module never learns what a shipping rate or tracking code is.
- Deleting this module removes shipping from checkouts and order detail entirely; nothing else holds its state.
- The two `published-language` edges are declared by the *mounting* modules (`cart`, `orders`), not in this module's manifest.
