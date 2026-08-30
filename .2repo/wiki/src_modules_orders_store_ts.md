# src/modules/orders/store.ts

## Purpose

Pinia store for order CRUD, paginated search, and two non-record-shaped actions (`cancelOrder`, `downloadInvoice`). It wraps the raw `@api` order endpoints behind the toolkit's `useStructureCrudApi` primitive so components get a uniform record-cache + list/pagination surface, while the two hand-written actions cover responses that don't fit the record-shaped toolkit (a cancelled-order write-back and a PDF Blob).

## Key elements

- **`useOrdersStore`** — the exported Pinia store (`'orders'`). Setup-function style; all state and actions are returned in a flat object.
- **`orders` / `ordersList` / `currentOrder` / `selectedOrderId`** — record cache (dictionary), derived list, and selection bindings produced by `useStructureCrudApi`.
- **`filters` / `pageCurrent` / `pageSize` / `pageTotal` / `pageItemList`** — search and pagination state owned by the toolkit; `filters` is typed `OrdersFilters` (i.e. `SearchOrdersRequest` minus `page`/`pageSize`).
- **`fetchOrders`, `fetchPaginationOrders`, `watchSearchOrders`, `fetchOrder`, `watchOrder`, `createOrder`, `updateOrder`, `deleteOrder`** — CRUD and list/search actions generated from the toolkit primitive.
- **`hardDeleteOrder(orderId)`** — calls `deleteTarget` with `hardDeleteOrderById`; irreversible, distinct from soft `deleteOrder`.
- **`cancelOrder(orderId, refund?)`** — calls `cancelOrderById`, writes the returned record back via `addOrder`, and rethrows the server's 409 on status races. `refund` is an operator-only flag (ignored for customer-initiated cancels server-side).
- **`downloadInvoice(orderId)`** — wraps `getOrderInvoice`; resolves with a PDF `Blob`.
- **`deleteTarget`, `fetchAny`** — toolkit helpers used by the hand-written actions to route loading/error state through the shared `useCoreStore` flags.

## Relationships

No graph-neighbor files were listed. The store imports from:

- `@guebbit/vue-toolkit` — `useCoreStore` (shared per-key loading flags) and `useStructureCrudApi` (CRUD/cache/pagination primitive).
- `@api` — individual order endpoint functions (`listOrders`, `searchOrders`, `getOrderById`, `createOrder`, `updateOrderById`, `deleteOrderById`, `hardDeleteOrderById`, `cancelOrderById`, `getOrderInvoice`).
- `@types` — `Order`, `CreateOrderRequest`, `UpdateOrderByIdRequest`, `SearchOrdersRequest`.

## Notes

- **`maxRecords: 5000`** overrides the toolkit's 100 000 default. Rationale in the code: an order carries embedded line items, so it is far heavier than a product or user. The backstop drops the *entire* dictionary when exceeded and immediately repopulates with the incoming batch; safe here because every list is server-paginated, but would be visible on an infinite-scroll UI.
- **Checkout is deliberately absent.** `POST /cart/checkout` belongs to `useCartStore`; this store learns about a new order only by fetching it after the fact.
- **Soft vs. hard delete are separate methods** (`deleteOrder` vs. `hardDeleteOrder`) rather than a boolean flag, to make the irreversible path explicit.
- **`cancelOrder` returns the server's post-cancel record** and writes it into the cache, so the UI reflects the new status immediately. A concurrent status change surfaces as a 409, not a silent overwrite.
- **`refund` param is optional** and only meaningful for operator-initiated cancellations; the API defaults it to `true` for customer-initiated ones.
