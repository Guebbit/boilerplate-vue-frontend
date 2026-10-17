---
source: contracts/rest/error-codes.ts
sha256: 258cf687dac9b710af56ea8fdfc12da4f831921a819514d9e9b75f4e5196cd7c
generated_at: 2026-10-16T23:54:31.039353+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/error-codes.ts

## Purpose

Auto-generated enumeration of every error code declared in the OpenAPI contract. It exists as the single typed reference for all REST error codes so that consumers (client SDKs, error-handling middleware, test suites) can match against a known set rather than raw strings. Adding a new code is additive and never a breaking change.

## Key elements

- **`ERROR_CODES`** — `export const`; a flat object whose keys and string values are identical (e.g. `CART_EMPTY: 'CART_EMPTY'`). Each property carries a JSDoc comment stating the HTTP status, the trigger condition, and—where applicable—what the `errors[].details` payload contains. Codes span: cart/checkout, order lifecycle, delivery/fulfillment, payment, email/verification, idempotency, multipart upload limits, inventory, inventory, and generic handler defaults (`BAD_REQUEST`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`, `INVALID_REQUEST`).

## Relationships

No graph neighbors.

## Notes

- **Generated file** — do not edit manually. Regenerate with `npm run gen:api` (source: `openapi.yaml`).
- The values are **identical strings** to their keys; the object exists for autocomplete and type-safety, not for mapping.
- Several codes encode deployment-specific limits (`NODE_ADDRESS_BOOK_MAX`, `NODE_MAX_OPEN_UNPAID_ORDERS_PER_ACCOUNT`, `NODE_ORDER_EXPORT_MAX_ROWS`, `NODE_ADMIN_ORDER_MAX_LINES`, `NODE_ADMIN_ORDER_MAX_LINE_QUANTITY`). The numeric cap is never embedded in the code string itself; it is named only in the JSDoc.
- `INVALID_REQUEST` is a catch-all for unhandled 4xx that bubble to the global error handler; routes that catch the failure themselves should answer with the status-derived code instead.
- `FORBIDDEN` can be overridden per-key by a key's own `deniedCode` for a more specific response.
- 429-family codes (`EMAIL_CHANGE_TOO_SOON`, `EMAIL_VERIFY_RESEND_TOO_SOON`) carry a `details.retryAfter` field.
- Stock-related codes (`CART_INSUFFICIENT_STOCK`, `ORDER_INSUFFICIENT_STOCK`) include `availability` / `available` in details **only** for callers holding the `read:StockLevel` permission.
