# docs/modules/orders.md

## Purpose

Client-side module for the order lifecycle: a customer's order list, the order detail view (with embedded payment and shipment panels), and the admin edit/cancel screens. It is a leaf in the dependency graph—nothing imports from it—and it composes its three screens around components it mounts from other modules rather than reading their state.

## Key elements

- **Store `orders`** (`store.ts`) — Pinia store exposing state (`orders`, `selectedOrderId`, `filters`, `pageCurrent`, `pageSize`), getters (`ordersList`, `currentOrder`, `loading`, `pageTotal`, `pageItemList`), and 12 actions (`fetchOrders`, `fetchOrder`, `createOrder`, `updateOrder`, `cancelOrder`, `hardDeleteOrder`, `downloadInvoice`, etc.).
- **Three screens** — `OrdersList` (auth), `OrderTarget` (auth), `OrderEdit` (admin), each a routed Vue view under `views/`.
- **11 API endpoints** registered in `response-schemas.ts` with Zod envelopes (list, get, create, update, cancel, hard-delete, invoice, search).
- **`module.ts`** — the manifest that the application loads; declares routes, nav entry, schemas, dependency edges, and locales.
- **Mounted panels** — `PaymentPanel` (from `payments`) and `ShipmentPanel` (from `delivery`) render on the order detail screen; the orders module holds only the layout around them.
- **Locales** — `en` and `it`, each loaded as a separate chunk.

## Relationships

- **→ `payments`** (graph neighbor) — The order detail screen mounts `PaymentPanel` from the payments module. This is a *published-language* edge: orders never reads the payments store, never knows which provider exists, and never touches payment state. Payment fetching and rendering are entirely the panel's responsibility.

(`products` appears as a graph neighbor but has no interaction described in this module's content; no import, mount, or store access is present.)

## Notes

- **No barrel, no publishers** — no other module can import from `orders`. The dependency arrow is strictly one-way into this folder.
- **Reorder button inverts the server arrow** — the order page reaches into the `cart` store to refill items. On the server the flow is the opposite (checkout creates an order). Both are correct; the client import direction is what defines the module's dependency.
- **Scoping is server-side** — the client renders whatever the endpoint returns. A customer sees only their own orders; an admin sees all. No client-side filtering enforces this.
- **Access is declared once per route** in `meta.access`; the navigation entry does not restate it, preventing menu/router drift.
- **11 endpoints, one Zod envelope each** — toggling the domain on/off flips all contract validation at once via the manifest.
