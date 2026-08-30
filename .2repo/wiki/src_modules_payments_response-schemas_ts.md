# src/modules/payments/response-schemas.ts

## Purpose

Declares the response-envelope schema registrations for all four payments endpoints consumed by the module. Each entry pairs an HTTP method with a URL regex pattern and a Zod-style schema, so the shared HTTP layer can validate responses at runtime.

## Key elements

- **`paymentsResponseSchemas: ResponseSchemaRoute[]`** — the sole export. An ordered array of four route entries:
  - `POST /payments/intent` → `schemas.CreatePaymentIntentResponse`
  - `GET /payments/order/:id` → `schemas.GetPaymentByOrderResponse`
  - `POST /payments/order/:id/refund` → `schemas.RefundPaymentByOrderResponse`
  - `POST /payments/:id/confirm` → `schemas.ConfirmPaymentResponse`

## Relationships

- **`src/modules/payments/module.ts`** — the module manifest that consumes `paymentsResponseSchemas` and registers the entries with the HTTP response-schema map. This file is the data source; `module.ts` is the consumer.
- Imports `ResponseSchemaRoute` (type) from `@/infrastructure/http/response-schema-map` and concrete schemas from `@api/schemas`.

## Notes

- The `refund` entry is deliberately placed **before** the `confirm` entry. Although the two patterns differ in their literal tail (`/refund` vs `/confirm`) and therefore cannot collide, the adjacency makes that non-collision visually obvious rather than incidental.
- Patterns are anchored regexes (`^…$`), not glob strings. The `[^/]+` segment is intentionally non-greedy to avoid swallowing a trailing path segment.
- The file is a pure data module (no logic, no side effects beyond the array literal); ordering in the array is meaningful only for the refund/confirm readability note above.
