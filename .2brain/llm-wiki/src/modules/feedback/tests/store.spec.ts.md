---
source: src/modules/feedback/tests/store.spec.ts
sha256: 2547472a66a684646e7e07c4d99c8147ae20a361f534836bed6e90611a216a69
generated_at: 2026-10-02T15:07:13.762317+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/tests/store.spec.ts

## Purpose

Vitest spec for `useFeedbackStore`. It exercises the store against a transport-mocked `orvalMutator` (router keyed on `METHOD /url`) so the generated HTTP client and the Pinia store remain real. It pins the inbox reading path (`POST /feedback/search`, never the browser-cached GET), server-sourced `pageTotal`, and write/evict semantics on the cached row.

## Key elements

- **`TICKET`** – Fixture feedback ticket with all contract-required fields (including `createdAt`).
- **`currentTicket`** – Mutable in-memory "server state"; `ticketStateEnvelope` reads/writes it so a subsequent search reflects the prior write or delete (mimics vue-toolkit 5's `watchSearchRequests` refetch).
- **`responses`** – Static per-test response table for routes that don't touch ticket state (e.g. `POST /feedback/contact`). Reset in `beforeEach`.
- **`ticketStateEnvelope(method, url)`** – Dynamic handler for `POST /feedback/search`, `PATCH /feedback/f1`, and `DELETE /feedback/f1`; returns a fresh `orvalEnvelope` each call.
- **`vi.mock('@/infrastructure/http', …)`** – Replaces `orvalMutator` with a resolver that first checks `ticketStateEnvelope`, then falls back to the static `responses` table, and validates the result through `parseOrvalFixture`.
- **`requestedUrls()` / `lastBody()`** – Helpers to assert call order and JSON body of `orvalMutator` invocations.
- **`describe('submitContact')`** – Verifies the form POSTs to `/feedback/contact` and passes the honeypot `website` field through untouched.
- **`describe('the inbox search')`** – Covers POST (not GET) usage, no query string, explicit page/size, sort filtering (valid vs. invalid field), multi-filter passthrough, `pageTotal` from server meta (not local cache length), and error-handler invocation.
- **`describe('updateRequest')`** – Confirms `PATCH /feedback/f1` body shape via `contractRequest` and that the store caches the API-returned row.
- **`describe('deleteRequest')`** – Asserts the three-call sequence (search → delete → refetch) that vue-toolkit 5's active watcher triggers, and that the page list is empty afterwards.

## Relationships

- **`src/infrastructure/http/index.ts`** – Source of `orvalMutator`, which this spec mocks via `vi.mock`. The mock intercepts every HTTP call the generated client makes, keeping the rest of the stack real.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope before any test runs; it registers the `@/` and `@api/` aliases so the dynamic `import * as schemas from '@api/schemas'` and the `@/modules/…` / `@/infrastructure/…` imports resolve under Vitest.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (wraps a payload in the standard API envelope), `parseOrvalFixture` (validates a mocked response against the generated schema before resolving), and `contractRequest` (validates a request body against the contract schema).

## Notes

- The inbox is read via **`POST /feedback/search`**, never `GET /feedback`. The GET is browser-cached ~30 s and the API rejects undeclared cache-busting params with 422.
- `pageTotal` is asserted to equal **4** (from server `meta.totalPages`), not 1 (the local cache length). The vue-toolkit 5 default counts local rows; the store overrides this with server meta.
- `currentTicket` is mutable by design: a frozen fixture would let a post-write refetch silently restore the old row, masking the exact stale-list bug vue-toolkit 5's `watchSearchRequests` fixes.
- `TICKET.createdAt` is called out in a comment as a class of gap that `parseOrvalFixture`'s schema validation catches—i.e., a field the fixture could omit but the real contract requires.
- The delete test expects **three** `orvalMutator` calls (search → delete → search), not two. The third is the active watcher's automatic refetch, which is the mechanism that proves server-side deletion rather than merely a local cache eviction.
