---
source: src/modules/inventory/tests/use-product-picker.spec.ts
sha256: c5ff2334dcd982e2cb10079a38d8278ef16217100aafc8adcdbaebc745bb8dd3
signature: 6e9d14d7da4cf5dd3b11ac08feae9da44dbd98641a370f8a0d508cbec3ada032
generated_at: 2026-11-10T04:37:10.342027+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/use-product-picker.spec.ts

## Purpose
Unit tests for the `useProductPicker` / `useProductPickerPin` composables, covering two behaviours that `StockMovementForm` and `MovementLedger` now share: search-as-you-type (with debounce) and `pin()`. Only the HTTP transport (`orvalMutator`) is stubbed; the real `@api` schemas are left intact so that any regression in the request shape `searchProducts` builds is caught directly.

## Key elements
- **`describe('useProductPicker')`** – five test cases:
  - Initial empty-query search fires immediately at `/products/search` (POST) with `pageSize: 20`.
  - Rapid keystrokes are debounced into a single request (asserted at the 299 ms / 300 ms boundary with fake timers).
  - `pin(id)` is a no-op when the id is already on the current search page.
  - `pin(id)` fetches by id (same endpoint, `id: ['p2']`, `pageSize: 1`) when the id is not on the page and prepends it to `options`.
  - A pinned item is dropped (no duplicate) once a subsequent search returns it organically.
- **`describe('useProductPickerPin')`** – verifies the reactive getter pins immediately and re-pins on every change to the returned value.
- **`respondWith(items)`** – re-stubs `orvalMutator` so the next call resolves with a fixture shaped by `parseOrvalFixture`.
- **`lastRequest()`** – extracts the most recent axios config (`url`, `method`, `data`) passed to `orvalMutator` for assertions.
- **`WIDGET` / `GADGET`** – two minimal `Product` fixtures using `NO_PRODUCT_ACTIONS`.

## Relationships
- **`src/modules/inventory/composables/use-product-picker.ts`** – the system under test; imports `useProductPicker` and `useProductPickerPin`.
- **`src/infrastructure/http/index.ts`** – source of the `orvalMutator` import; the test stubs it as the sole HTTP boundary so no real requests are made.
- **`tests/support/unit/orval-fixture-schema.ts`** – supplies `contractRequest` (schema-validates the request body) and `parseOrvalFixture` (shapes the mock response to match orval's parser).
- **`tests/support/unit/fixtures.ts`** – provides `NO_PRODUCT_ACTIONS` used in the product fixtures.

## Notes
- `vi.useFakeTimers()` is set in `beforeEach` / restored in `afterEach`; all async waits go through `vi.runAllTimersAsync` or `vi.advanceTimersByTimeAsync`—never real `setTimeout`.
- `respondWith` can be called multiple times within a single test to simulate *different* responses from the same endpoint (e.g. the initial search vs. the pin's by-id lookup).
- `contractRequest` assertions run against the **real** `@api/schemas`, so a breaking change to `SearchProductsBody` fails here without touching the composable.
