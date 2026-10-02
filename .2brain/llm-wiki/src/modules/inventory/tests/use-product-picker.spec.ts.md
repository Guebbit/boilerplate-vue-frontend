---
source: src/modules/inventory/tests/use-product-picker.spec.ts
sha256: 4386df9f041124d2a91aa23dfac9d94330543e794db563fa804c89a0c64683fd
generated_at: 2026-10-02T15:11:19.565339+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/use-product-picker.spec.ts

## Purpose

Unit tests for the `useProductPicker` composable (and its `useProductPickerPin` helper), covering the shared search-as-you-type list and `pin()` behaviour that `StockMovementForm` and `MovementLedger` now use in place of their former per-form product caches (FE_PARITY_0924 B2). Only `orvalMutator` is mocked so the actual request body shape built by `searchProducts` is exercised.

## Key elements

- **`respondWith(items)`** — Test helper that makes the next `orvalMutator` call resolve with a single-page product list, wrapped in a parsed Orval fixture envelope.
- **`lastRequest()`** — Extracts the most recent axios-config argument passed to the mocked `orvalMutator` for assertion.
- **`WIDGET` / `GADGET`** — Two fixed `Product` fixtures (`p1`/`p2`) used throughout as stand-ins for search-page results and pinned items.
- **`describe('useProductPicker')`** — Five tests: initial empty-query fetch (POST `/products/search`, `pageSize: 20`); debounce (3 keystrokes → 1 call after 300 ms); pin of an id already on the page (no extra fetch); pin of an off-page id (separate `id: ['p2'], pageSize: 1` lookup, prepended to options); dedup when a fresh search returns the pinned id.
- **`describe('useProductPickerPin')`** — Verifies that passing a getter to `useProductPickerPin` triggers a pin on the initial value.
- **`vi.mock('@/infrastructure/http', …)`** — Replaces the entire HTTP module with a single `orvalMutator` spy, keeping `@api` schema imports real.

## Relationships

- **`src/infrastructure/http/index.ts`** — The module under mock. The test replaces `orvalMutator` (the single HTTP transport) with a `vi.fn()` so no real network call is made; all assertions on request shape go through the mocked function's call arguments.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `contractRequest` (validates a request body against an API schema without throwing), `orvalEnvelope` (builds the standard response envelope), and `parseOrvalFixture` (deserialises the envelope into a typed response). The test imports these to assert request contracts and to shape mock responses.

## Notes

- The module doc comment explicitly states the intent: `@api` stays real; only the transport is faked. A regression in the *request shape* of `searchProducts` would surface here, not in a component test.
- Debounce timing is pinned to 300 ms via `vi.advanceTimersByTimeAsync(299)` / `(1)` — if the composable's debounce constant changes, these thresholds must follow.
- The `pin()` off-page test re-invokes `respondWith([GADGET])` to give the pin's own by-id lookup a different answer than the initial page; forgetting that swap makes the test pass trivially.
- `contractRequest` is imported from the fixture helper, not from `@api` directly — it wraps the schema check so a mismatch *throws*, letting `toMatchObject` confirm the expected fields.
