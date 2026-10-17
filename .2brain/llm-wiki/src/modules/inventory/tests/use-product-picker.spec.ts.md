---
source: src/modules/inventory/tests/use-product-picker.spec.ts
sha256: 532385b376d8541c0fb0ff173747a61170528239b7f2c55223a9c6eaa07e9360
generated_at: 2026-10-17T01:02:08.822072+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/use-product-picker.spec.ts

## Purpose

Unit tests for the `useProductPicker` / `useProductPickerPin` composables, covering the search-as-you-type list and the `pin()` mechanism that `StockMovementForm` and `MovementLedger` share. Only the HTTP transport (`orvalMutator`) is mocked; the real request builder and API schemas stay in the loop so a shape regression would surface here.

## Key elements

- **`lastRequest()`** – returns the most recent axios config (url, method, data) passed to `orvalMutator`; throws if it was never called.
- **`respondWith(items)`** – sets the next `orvalMutator` implementation to resolve a schema-valid envelope wrapping the given `Product[]`.
- **`WIDGET` / `GADGET`** – two fixed `Product` fixtures used throughout the suite to represent "current page" and "pinned" items.
- **`describe('useProductPicker')`** – five cases:
  - immediate search on mount (empty query, `pageSize: 20`).
  - 300 ms debounce: three keystrokes produce exactly one request carrying the final text.
  - `pin(id)` is a no-op when the id is already in the current result page.
  - `pin(id)` issues a by-id fetch (`id: [id]`, `pageSize: 1`) and prepends the result.
  - a subsequent search that naturally returns the pinned id causes the pin to be dropped (no duplicate).
- **`describe('useProductPickerPin')`** – verifies the reactive wrapper pins the getter's value immediately and re-pins on every change.

## Relationships

- **`src/modules/inventory/composables/use-product-picker.ts`** – the module under test; the spec imports `useProductPicker` and `useProductPickerPin` directly.
- **`src/infrastructure/http/index.ts`** – the sole mock target (`orvalMutator`). All assertions about *what* is sent go through the real request builder; only the network boundary is faked.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – supplies `contractRequest` (validates a request body against the `@api/schemas` contract), `orvalEnvelope`, and `parseOrvalFixture` (wraps raw items in the expected HTTP envelope for the mock to return).

## Notes

- **Fake timers are mandatory.** `beforeEach` installs `vi.useFakeTimers()`; every `await` that touches the debounce must be paired with `vi.runAllTimersAsync()` or `vi.advanceTimersByTimeAsync()`. Forgetting this leaves promises unflushed.
- **Schema-validated requests.** The spec does not hand-craft expected payloads; it runs the actual request body through `contractRequest(schemas.SearchProductsBody, …)` so a drift in the generated API contract fails the test rather than a hard-coded assertion.
- **Pin deduplication is an invariant, not a feature flag.** The "drops the pin once a fresh search brings the same id back" test encodes the rule that `options` must never contain the same product id twice, regardless of how it got there.
- **`useProductPickerPin` is thin.** It only re-invokes the existing `pin` function whenever the reactive getter changes; there is no separate fetch path or state to test beyond delegation.
