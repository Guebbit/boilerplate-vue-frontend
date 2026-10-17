---
source: src/modules/feedback/tests/store.spec.ts
sha256: 8a4bbe268eea6f2d30a01f7990719509ae39ed69dc205e7cab3f7b9eb71ea51e
generated_at: 2026-10-17T00:56:38.852312+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/tests/store.spec.ts

## Purpose

Unit tests for the feedback Pinia store, with the HTTP transport mocked at the `orvalMutator` level so both the generated API client and the store logic remain real. Pins down that inbox reads go through `POST /feedback/search` (not the browser-cached GET), that `pageTotal` comes from server-side meta rather than local row count, and that writes correctly patch or evict the cached row.

## Key elements

- **`TICKET`** — fixture ticket object; includes `createdAt` to satisfy the real contract schema.
- **`currentTicket`** — mutable variable simulating the API's own server-side state; mutated by the mocked `PATCH`/`DELETE` and read back by `POST /feedback/search`.
- **`responses`** — per-test static response table (keyed `METHOD /url`) for routes that don't need stateful behavior.
- **`ticketStateEnvelope(method, url)`** — returns a fresh envelope for the three stateful routes (`search`, `PATCH /feedback/f1`, `DELETE /feedback/f1`); returns `undefined` for routes not owned by it.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a router that dispatches on `METHOD /url`, resolving through `parseOrvalFixture` (schema-checked).
- **`requestedUrls()`** / **`lastBody()`** — small helpers for asserting call order and request payloads.
- **`describe('submitContact')`** — verifies the public form POST and that the honeypot field is passed through untouched.
- **`describe('the inbox search')`** — covers POST-based pagination, page/size pass-through, sort filtering (valid sorts sent, invalid dropped), all supported filters, server-side `pageTotal`, and error-handler invocation.
- **`describe('updateRequest')`** — verifies `PATCH /feedback/f1` body and that the store caches the API's returned row.
- **`describe('deleteRequest')`** — verifies `DELETE /feedback/f1`, the subsequent refetch by the active watcher, and empty page state.

## Relationships

- **`src/modules/feedback/store.ts`** — the module under test; `useFeedbackStore` is imported and exercised in every test.
- **`src/infrastructure/http/index.ts`** — source of `orvalMutator`; entirely replaced by the `vi.mock` factory so tests control all outgoing HTTP.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register DI bindings the store depends on.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope`, `parseOrvalFixture` (schema-validates fixture payloads before resolving), and `contractRequest` (asserts request bodies against the generated schema).

## Notes

- The mock is **stateful** (`currentTicket`), not a frozen fixture: vue-toolkit 5's `watchSearchRequests` refetches after every write, so a static snapshot would silently resurrect a just-deleted or just-patched row.
- The delete test asserts **three** outgoing requests (search → delete → search). The third is the watcher's automatic refetch, not an explicit store call.
- `POST /feedback/search` is used deliberately instead of `GET /feedback`; the GET is browser-cached for 30 s and the contract declares no cache-busting parameter (an undeclared param triggers a 422).
- `parseOrvalFixture` runs on every mocked response, so fixture drift against `@api/schemas` is caught at test time rather than at runtime.
