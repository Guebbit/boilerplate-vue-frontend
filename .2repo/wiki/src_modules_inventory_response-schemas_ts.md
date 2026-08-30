# src/modules/inventory/response-schemas.ts

## Purpose
Declares the response-envelope validation schemas for every inventory API endpoint this module calls. The exported array is consumed by the `response-schema-map` middleware to verify that each call's response body conforms to the expected Zod schema before the caller processes it.

## Key elements

- **`inventoryResponseSchemas: ResponseSchemaRoute[]`** — The sole export. An array of five route entries, each pairing an HTTP method, a regex `pattern` for the URL path, and a Zod `schema` from `@api/schemas`:
  - `GET /inventory/levels` → `ListInventoryLevelsResponse`
  - `GET /inventory/movements` → `ListStockMovementsResponse`
  - `POST /inventory/receipts` → `ReceiveStockResponse`
  - `POST /inventory/adjustments` → `AdjustStockResponse`
  - `POST /inventory/reservations/sweep` → `SweepReservationsResponse`

## Relationships

- **`src/modules/inventory/module.ts`** — Registers `inventoryResponseSchemas` in the module manifest, wiring these route/schema pairs into the `response-schema-map` middleware that intercepts outgoing inventory API calls.

## Notes

- Patterns are anchored regexes (`^…$`) and include an optional `(\?.*)?` group for query strings on the two `GET` routes; `POST` routes have no query-string allowance.
- The `POST /inventory/reservations/sweep` entry is intentionally dual-triggered: the UI "sweep" button on the ledger page and a production cron are both treated as "outside ticks" per the contract, so the response schema must satisfy both call paths.
- Schemas are sourced from the shared `@api/schemas` package — do not redefine them locally.
