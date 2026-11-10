---
source: src/modules/stock-alerts/tests/store.spec.ts
sha256: a4b10b774bdee5db1c26e41911fdb9e59fff0356d87984da781af1e57096f6a3
signature: 152db5401f588c8d2bdbe3e44858276d3943b390d1893c07cbc6ead67bca3a81
generated_at: 2026-11-10T05:55:48.224638+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/tests/store.spec.ts

## Purpose
Vitest spec for the stock-alerts Pinia store. Verifies list-replacement semantics, the "already asked" set, concurrent-read deduplication, and failure-toast behaviour — all with only the HTTP transport mocked so the store logic itself is exercised for real.

## Key elements
- **`wireModulesIntoCore()`** – called at module top level (before imports resolve) to register the store with the core Pinia instance.
- **`responses: Record<string, unknown>`** – mutable per-test map of canned API payloads keyed on `"METHOD /url"`; each test reassigns it before acting.
- **`vi.mock('@/infrastructure/http', …)`** – replaces `orvalMutator` with a router that looks up `responses` by `METHOD /url` and wraps the value via `parseOrvalFixture`.
- **`requestedUrls()`** – helper that returns the `url` field of every recorded `orvalMutator` call, in order.
- **`beforeEach`** – resets Pinia, clears mocks, and seeds default responses for `GET /stock-alerts`, `POST /stock-alerts`, and `DELETE /stock-alerts/p1`.
- **Test cases**
  - *replaces the list … knows which products were asked* – `fetchStockAlerts` populates `items`; `isAsked` reflects the set.
  - *asks with a POST and cancels with a DELETE* – verifies `ask` sends `productId` in the request **body** (not URL) and `cancel` issues a DELETE; both replace the list.
  - *reads once for fifty buttons on a grid* – concurrent + repeated `ensureStockAlerts` calls collapse to a single HTTP request.
  - *toasts a failed shared read once* – a 500 rejection produces exactly one toast, the promise still resolves, and a subsequent call retries.

## Relationships
- **`src/modules/stock-alerts/store.ts`** – the unit under test (`useStockAlertsStore`); all assertions target its state and actions.
- **`src/infrastructure/http/index.ts`** – provides `orvalMutator`, which is the single mock boundary; everything above (orval client, store logic) runs for real.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` shapes the raw canned value into the expected response envelope inside the mock.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore` ensures the store is registered in the global Pinia core before `setActivePinia` in `beforeEach`.

## Notes
- The mock key is `"METHOD /url"` (e.g. `"DELETE /stock-alerts/p1"`); the method is upper-cased by the mock. Mismatching the key silently returns `undefined` to `parseOrvalFixture`.
- `ask` puts `productId` in the request **body**, not the URL — the test explicitly asserts this because the list endpoint is the parent and the request carries no per-product URL segment.
- `ensureStockAlerts` is designed to never reject: a transport failure resolves (after toasting) so that a grid of 50 buttons doesn't all crash on a single 500.
- The `useNotificationsStore` from `@guebbit/vue-toolkit` is spied on directly (not mocked) to assert the toast was called once with the server-provided message.
