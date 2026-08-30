# docs/modules/cart-checkout.md

## Purpose

Documents the checkout flow module — the client's only multi-step flow. It collects an address and a shipping-method id, sends them via `POST /cart/checkout`, and renders whatever the server returns. No pricing, stock, or availability logic lives here.

## Key elements

- **Checkout flow** – three-step UI (pick address → pick shipping → submit). All arithmetic is server-side.
- **`ShippingSelector`** (mounted from `delivery`) – self-contained component; this module only passes a binding for the chosen method id and reads that id back. Fetches its own methods and rates.
- **Error handling (four modes)** – `409` (race lost, refetch cart), `422` (per-line stock shortfall), `404` (address/method gone, reopen step), transport failure.
- **`CHECKOUT_REQUEST_FAILED`** – the single analytics event (Umami) emitted by this client for checkout. All other checkout events are server-emitted.
- **Post-success behavior** – the store replaces the local cart with the empty payload from the API, clearing the header badge.

## Relationships

- **`cart`** – This module *belongs to* the cart store. On success the cart is overwritten with the server's empty cart; that is why checkout logic lives in the cart module rather than in orders. The cart module is labelled `core` because the screen/flow is load-bearing even though the arithmetic is not client-side.
- **`account`** – The address-picking step reads from the account's saved addresses ("the account's saved book"). The 404 path (address no longer exists) sends the user back to that step.

## Notes

- The `422` response carries a **list** (`errors[0].details.lines`) with `productId`, `title`, `requested`, `available` per short line. Rendering it as a single "some items unavailable" message discards the per-line data and turns a one-pass fix into guesswork.
- `409` is **not** a retryable error — re-sending the request would find an already-empty cart.
- The analytics split (one client event, all others server-side) is deliberate: the only failure the server *cannot* report is a request that never reached the API, and that is exactly what `CHECKOUT_REQUEST_FAILED` covers.
- `ShippingSelector` is a hard dependency to render but a soft one to remove: deleting `delivery` loses a step but does not break the module, because no state or pricing data crosses the boundary — only a method-id label does.
