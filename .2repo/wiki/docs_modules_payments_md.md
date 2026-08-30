# docs/modules/payments.md

## Purpose

Component-only payment domain. Owns `PaymentPanel` and `useOrderRefund`, exposes a `payments` Pinia store, and calls 4 backend endpoints. It has no routes and no navigation entries — it exists to be mounted by a sibling module, not to navigate on its own.

## Key elements

- **`PaymentPanel`** (`components/PaymentPanel.vue`) — The payment UI component. Its props contract is the public API; `orders` mounts it.
- **`useOrderRefund`** (`composables/use-order-refund.ts`) — Reusable reactive refund logic sitting between store and component.
- **`payments` store** (`store.ts`) — State (`payment`), computed getter (`loading`), and three actions: `fetchPaymentForOrder`, `payForOrder`, `refundForOrder`.
- **`index.ts`** — Public barrel; the only import surface siblings are allowed to touch.
- **`module.ts`** — Manifest declaring name, response schemas, dependency edges, and locales (`en`, `it`).
- **`response-schemas.ts`** — Zod envelopes for the 4 endpoints (`POST /payments/intent`, `POST /payments/{id}/confirm`, `GET /payments/order/{id}`, `POST /payments/order/{id}/refund`).
- **Locales** — `locales/en.json`, `locales/it.json`, each loaded as its own chunk.

## Relationships

- **`orders` → payments** (`published-language`): `orders` imports `PaymentPanel` from this module's barrel and mounts it on the order page. This is the only consumer; nothing else in the client imports this module.
- **payments → `boilerplate-node-backend` / `payments`**: The 4 API calls above hit that backend domain. The backend provider is a mock/fake; the client is unaware of which provider handles it.

## Notes

- The store lives outside the component so that mounting `PaymentPanel` twice on one page does not duplicate fetches. The panel is a view; the store is the domain state.
- A payment **decline** is a valid outcome (`succeeded` | `declined`), not an error. It carries its own message rather than triggering an error toast.
- Changing `PaymentPanel`'s prop signature is a breaking change for `orders` — treat it as a public contract.
- Deleting this module is a single `rm -rf` + one registry line; `orders` reverts to having no payment flow. No other client code is affected.
