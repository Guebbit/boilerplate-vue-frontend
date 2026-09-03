# docs/modules/cart-checkout.md

## Purpose

Documents the checkout flow — the only multi-step interaction in this client — covering how the user picks an address and shipping method, submits to `POST /cart/checkout`, and handles the four distinct failure modes. The file exists to make clear that the client collects inputs and renders server answers; all pricing, stock, and availability decisions live server-side.

## Key elements

- **Checkout flow** — address selection → `ShippingSelector` (mounted) → `POST /cart/checkout` → store replaced with empty cart → route to new order.
- **`ShippingSelector`** — mounted from `delivery` barrel; this module passes only the chosen method-id binding and reads nothing else back.
- **Error handling (four refusals)** — `409` race (refetch, do not retry), `409` `CART_INSUFFICIENT_STOCK` (per-line shortfalls), `404` (address/method gone, reopen that step), transport failure.
- **`CHECKOUT_REQUEST_FAILED`** — the single analytics event emitted by this client; all other checkout events are server-side.
- **Post-success store update** — local cart replaced with the authoritative (empty) payload from the API, preventing a stale header badge.

## Relationships

- **`docs/modules/cart.md`** — parent module; the store that holds cart state lives here, and checkout belongs to it rather than to `orders`.
- **`docs/modules/delivery.md`** — source of the `ShippingSelector` component. Interaction is one-way: pass a method-id binding in, read the id out. This module never sees rates, method counts, or pricing logic.
- **`docs/modules/orders.md`** — destination after success (route to the new order). Checkout is intentionally *not* placed here because the store mutation (clearing the cart) is a cart concern.
- **`docs/theory/domain-layer.md`** — explains why no totals, stock checks, or availability logic appear in this module; all domain arithmetic is server-side.
- **`docs/tools/umami.md`** — the one event this module emits (`CHECKOUT_REQUEST_FAILED`) writes into the shared Umami website; naming convention is one event name per emitter.

## Notes

- **409 race is not a retry.** Re-sending the request would hit an already-consumed cart. The correct recovery is to refetch and inform the user.
- **Stock-shortage payload is structured, not a string.** `errors[0].details.lines` carries `productId`, `title`, `requested`, `available` per line. Rendering it as a single "some items unavailable" message discards the data that lets the user fix the basket in one pass.
- **The `ShippingSelector` edge is vocabulary, not state.** This module never learns what a shipping rate is or how methods are priced. Deleting `delivery` removes a step from the UI but does not break the checkout submission.
- **Analytics split is intentional.** Any event backed by an API call is reported by the server (unforgeable, survives tab close). The client reports only what no request can carry — a failure that never reached the API.
