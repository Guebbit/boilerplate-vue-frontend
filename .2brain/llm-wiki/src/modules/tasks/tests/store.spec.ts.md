---
source: src/modules/tasks/tests/store.spec.ts
sha256: ef60361dc2a1875ceabe8dd8f958b0ca9f31e6ecd393855f0436094932bb8759
signature: 93596b1a31097ea469da4725b6281b7c9eae07698e0f303c5ef677a16a4686e1
generated_at: 2026-11-10T06:00:39.087002+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/store.spec.ts

## Purpose

Unit test for `useTasksStore`. It intercepts `orvalMutator` (the generated HTTP client) so the store and the orval-generated request shapes stay real while only the network is faked. It pins three behaviors: the inbox reads pages via `POST /tasks/search` (never the browser-cached `GET /tasks`), `pageTotal` comes from the server's `meta` rather than the local row count, and a write (resolve / assign / note / delete) patches or evicts the cached row—verified by the toolkit's automatic refetch.

## Key elements

- **`TASK`** – Fixture task object that also satisfies the API contract (includes `createdAt`). Seeded into `currentTask` before every test.
- **`currentTask`** – Mutable variable acting as the mocked server's single-row state. Mutated by `taskStateEnvelope` on resolve/delete, read back by the search route.
- **`responses`** – Per-test static response table keyed by `"METHOD /url"`, reset in `beforeEach`. Used for routes that don't depend on `currentTask` (assign, notes, submit).
- **`taskStateEnvelope(method, url)`** – Computes the envelope for the three stateful routes (`POST /tasks/search`, `POST /tasks/f1/resolve`, `DELETE /tasks/f1`) so a post-write search reflects the mutation.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a router that dispatches to `taskStateEnvelope` first, then falls back to the static `responses` table. All responses pass through `parseOrvalFixture` so schema violations still fail the test.
- **`requestedUrls()` / `lastBody()`** – Small helpers that inspect `orvalMutator`'s call log.
- **`describe('submitContact')`** – Verifies the form is POSTed to `/tasks` and that the honeypot `website` field is forwarded untouched.
- **`describe('the inbox search')`** – Asserts POST (not GET) with a `SearchTasksBody`-conformant payload, no query-string params, explicit page/size pass-through, contract-named sort filtering, full filter forwarding, server-derived `pageTotal`, and the `onError` callback.
- **`describe('the status doors')`** – Verifies resolve (no body, store updated), assign (`AssignTaskBody`), and addNote (`CreateTaskNoteBody`).
- **`describe('deleteRequest')`** – Confirms the three-request sequence (`search → delete → search`) driven by `watchSearchRequests` auto-refetch, and that the page list empties.

## Relationships

- **`src/modules/tasks/store.ts`** – The system under test; `useTasksStore` is instantiated against a fresh Pinia per test.
- **`src/infrastructure/http/index.ts`** – Provides `orvalMutator`, the single HTTP entry point this file replaces with a mock router so no real network I/O occurs.
- **`tests/support/unit/orval-fixture-schema.ts`** – Supplies `parseOrvalFixture` (validates mocked responses against the orval schema before the store sees them) and `contractRequest` (validates outgoing request bodies against the request schema).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module load so the orval-generated client and its dependencies resolve in the test runtime without a full app bootstrap.

## Notes

- The file deliberately avoids `GET /tasks` in assertions: the contract declares no cache-busting param, and the API answers an undeclared one with 422. The inbox must always use `POST /tasks/search`.
- `pageTotal` is asserted as `4` (from `meta.totalPages`), not `1` (the local `pageItemList` length), to guard against a regression to client-side counting.
- The delete test expects **three** `orvalMutator` calls, not two. The third is vue-toolkit 5's `watchSearchRequests` auto-refetch after the store marks the list stale; the fixture's mutable `currentTask` (now `undefined`) is what makes that refetch return an empty page.
- `TASK.createdAt` exists only because `parseOrvalFixture` enforces the schema; the original fixture omitted it, which is the class of bug this file's own wiring catches.
