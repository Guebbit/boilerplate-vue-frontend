---
source: src/modules/users/tests/store.spec.ts
sha256: 2016154f49bad0ae16dd3a955870fd84a2d9a7df0259e1ab69f018a72029fe93
signature: ed279d83f4a84a04e1cf4a2b6693ee789c4f5a9af3c42358a51025dc1612c58a
generated_at: 2026-11-10T06:07:39.224948+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/store.spec.ts

## Purpose

Unit tests for the `useUsersStore` Pinia store. The transport layer (`orvalMutator`) is mocked at the HTTP boundary so that tests can inspect the raw axios config (URL, method, body) emitted by each store action. The file follows the same structure as the products store spec, with one additional concern: verifying that a user's password (or uploaded avatar blob) is never parked in client-side store state.

## Key elements

- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a stub that returns a default `parseOrvalFixture` envelope (or `undefined` for DELETE), allowing per-test overrides via `respondWithItems` or `mockImplementationOnce`.
- **`lastRequest()` / `lastFormData()`** — helpers that pull the most recent axios config from the mock's call log and assert the body is `FormData` when expected.
- **`respondWithItems(items)`** — swaps the mock to answer with a paginated envelope (`items` + `meta` matching the real `PaginationMeta` shape).
- **`lastBody()`** — extracts the JSON body of the latest request via `asStub`.
- **`describe('createUser')`** — asserts JSON vs. multipart encoding, Blob preservation in FormData, and omission of `undefined` optional fields.
- **`describe('applyAccessChange')`** — asserts the correct endpoint (`/assign-role`, `/revoke-role`, `/deactivate`) is hit for role assignment, role revocation, and status-only changes.
- **`describe('updateUser')`** — asserts PATCH (not PUT) semantics, multipart for avatar uploads, the "clear travels as a second JSON PATCH" pattern, and that cached `imageUrl` is not nulled while a clearing update is still in flight.

## Relationships

- **`src/modules/users/store.ts`** — the module under test; `useUsersStore` is the sole import from this file.
- **`src/infrastructure/http/index.ts`** — source of `orvalMutator`, which is the single mocked dependency; all assertions target the config object passed to it.
- **`tests/support/stub.ts`** — provides `asStub`, used by `lastBody` to cast the raw config.
- **`tests/support/unit/fixtures.ts`** — provides `aUser`, a factory for well-formed user fixtures.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `parseOrvalFixture` (validates the mock's return shape) and `contractRequest` (validates a request body against an `@api/schemas` schema).
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, called once at module level to register any global test setup.

## Notes

- Tests **return** their promise chains instead of `await`ing; vitest treats a rejected returned promise as a failure, making `.then` assertions equally binding (see `docs/tools/unit-testing.md`).
- `beforeEach` calls `vi.clearAllMocks()`, which clears recorded calls but **not** an implementation set via `mockReturnValue`. The in-flight `imageUrl` test therefore uses `mockImplementationOnce` deliberately to avoid leaking a settled promise into later tests.
- The `@api/schemas` import is **not** mocked; it supplies real Zod (or equivalent) schemas for request-body validation via `contractRequest`.
- Multipart encoding is a concern of the generated client, not the store, which is why the transport is mocked rather than the encoder.
