# src/modules/feedback/tests/store.spec.ts

## Purpose

Vitest spec for the feedback Pinia store. It mocks only the HTTP transport (`orvalMutator`) so the generated Orval client and the store logic under test both run for real. The focus is verifying that the inbox is always replaced by what the API returned (never a local guess) and that a status update triggers a reload of the list it changed.

## Key elements

- **`TICKET`** — single fixture object (id `f1`) reused across all mocked responses.
- **`responses`** — mutable `Record<string, unknown>` acting as a per-test route table, keyed by `METHOD /url`. Reset in `beforeEach` to cover `POST /feedback/contact`, `GET /feedback`, and `PUT /feedback/f1`.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses` by the request's `method` and `url`. No other exports from that module are exercised.
- **`requestedUrls()`** — extracts the sequence of URLs passed to `orvalMutator`, used to assert call ordering.
- **`describe('submitContact')`** — asserts the action issues a single `POST /feedback/contact` with the public form fields.
- **`describe('fetchRequests')`** — asserts the store's `requests` array is fully replaced by the API payload.
- **`describe('updateStatus')`** — asserts the call order is `GET /feedback → PUT /feedback/f1 → GET /feedback` (the trailing GET is the reload).
- **`beforeEach`** — creates a fresh Pinia instance, clears mocks, and seeds the default `responses` table.

## Relationships

- **`src/infrastructure/http/index.ts`** — the module under test is the *sole* external dependency mocked here. The test intercepts `orvalMutator` so every HTTP call the generated Orval client makes is resolved from the in-memory `responses` table instead of the network. No other export from that module is imported or asserted.

## Notes

- The mock is a **transport-level router**, not a per-method mock. The Orval-generated client code still executes; only the final HTTP call is short-circuited. This mirrors the "transport-mocked" convention used in the wishlist spec.
- `responses` is a plain `let` binding, not a `vi.fn()`, so tests can reassign it per-suite if needed (none do currently). The default table in `beforeEach` covers all three endpoints; a test that hits an unlisted route will receive `undefined` and surface the mismatch.
- `requestedUrls()` reads `mock.calls` positionally, so it depends on `orvalMutator` being called with a single config object whose `.url` is a string. If the Orval client ever changes its call signature, this helper will silently return `undefined` entries.
