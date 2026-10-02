---
source: src/modules/delivery/tests/store.spec.ts
sha256: eb4b2b37513a08f6786286f0537abbec6a7a7fdf7cfb6cbbc4c94c43b2e8aa82
generated_at: 2026-10-02T15:05:48.323127+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/store.spec.ts

## Purpose

Unit tests for the delivery Pinia store (`useDeliveryStore`). Verifies that each store action (`fetchMethods`, `fetchShipmentForOrder`, `start`, `fulfill`, `ship`, `deliver`) mirrors the API contract, correctly distinguishes a 404 ("nothing shipped yet") from any other failure (which must reject), and shapes request payloads as the schema expects.

## Key elements

- **`METHODS`** – Two delivery-method fixtures (free-above threshold / flat-rate tracked) used to assert the store's `methods` array.
- **`responses`** – Mutable `Record<string, unknown>` of mocked HTTP answers keyed `"METHOD /url"`, reset in `beforeEach`. Setting a value to an `Error` instance triggers a 500 reject path.
- **`rejectWith(status, message)`** – Builds the API error-envelope rejection (`{ success: false, status, message, errors: […] }`) that `onResponseReject` produces; the only shape the store ever catches.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a lookup into `responses`; unkeyed calls 404, `Error` values 500, everything else is parsed through `parseOrvalFixture`.
- **`beforeEach`** – Creates a fresh Pinia, clears mocks, and re-assigns the default `responses` map (methods list, one shipment read, ship, deliver, start, fulfill).
- **`describe('fetchMethods')`** – Asserts method list, absence of query params, and `shipToCountries` mirroring.
- **`describe('fetchShipmentForOrder')`** – 404 → `undefined` (nothing shipped); 500 → rejects (the "one wrong answer" guard).
- **`describe('start')` / `describe('fulfill')`** – Resolve without mutating `store.shipment`; `fulfill` also rejects on non-digital-only orders.
- **`describe('ship')` / `describe('deliver')`** – Verify stored shipment state and that the request body omits or carries `forced`/`reason` as appropriate, checked via `contractRequest` against the API schema.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top level to register the delivery module (and its dependencies) into the app core so the store can be instantiated outside a live server.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Supplies `orvalEnvelope` (wraps fixture payloads into the API response shape), `parseOrvalFixture` (normalises a raw fixture into what the store receives), and `contractRequest` (validates a request body against an API schema before comparing).

## Notes

- The 404-vs-other-error distinction is the **load-bearing contract** of this file: only `status === 404` means "no shipment yet"; swallowing any other status would tell a customer their order is unshipped while the parcel is actually in transit.
- `rejectWith` carries an `eslint-disable` for `prefer-promise-reject-errors` because the API error envelope (a plain object, not a `native Error`) **is** the client's rejection contract.
- `responses` is a plain mutable object (not a `Map`), intentionally reassigned in individual tests to simulate different server states without a separate mock framework.
- `wireModulesIntoCore()` runs at import time, not inside `beforeEach`, so module registration is idempotent across the file.
