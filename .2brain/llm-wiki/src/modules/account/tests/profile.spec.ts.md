---
source: src/modules/account/tests/profile.spec.ts
sha256: f8a57427e643e202647a7da50b36c32bb9edeffaf8e7f24d6a124304570c9a6f
signature: 544e2eff1d1d50fdd40a46aebb2bac17ec4cdb13d93a3b6cf270bafea34393dd
generated_at: 2026-11-10T03:40:40.804664+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile.spec.ts

## Purpose

Unit tests for `useAccountProfileStore` covering profile fetch/update, role-view, email change, locale preference, account deletion/restore, and the export lifecycle (request → poll → download). The file mocks **only** the `orvalMutator` transport, keying canned responses by `METHOD /path`, so every layer above it — the generated Orval client, `useStructureRestApi`, the session store, and observability — executes for real.

## Key elements

- **`responses`** (mutable `Record<string, unknown>`) — rebuilt in `beforeEach`; the single source of truth for what each endpoint returns. Tests overwrite one key instead of re-mocking.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a `vi.fn` that looks up `responses[METHOD /path]` and wraps the answer via `parseOrvalFixture`.
- **`requestedUrls()`** — extracts the ordered list of URLs handed to the transport, used to assert *which* endpoint a flow hit.
- **`wireModulesIntoCore()`** — one-time setup call that wires test-support modules into the app's dependency graph before any test runs.
- **`USER` / `EXPORT`** — shared fixture constants for the representative record and the export status payload.
- **`describe` blocks** — `fetchProfile`, `updateProfile`, `requestEmailChange`, `locale preference`, `the account deletion flow`, `requestAccountExport`, `fetchAccountExport`, `downloadAccountExport`.
- **`contractRequest(schemas.…)`, `parseOrvalFixture(…)`** — from `orval-fixture-schema.ts`; used to validate that wire payloads conform to the OpenAPI schema and that fixtures are in the packed shape a real client expects.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/infrastructure/http/index.ts` | Mocked at the `orvalMutator` export. No other part of this module is touched. |
| `src/modules/account/stores/profile.ts` | Primary subject under test (`useAccountProfileStore`). |
| `src/modules/account/stores/auth.ts` | `useAccountAuthStore().login` is called in the deletion-flow test to establish a session the same way a real caller would. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is invoked at module load to prepare the test environment. |
| `tests/support/unit/orval-fixture-schema.ts` | Provides `parseOrvalFixture` (inside the mock) and `contractRequest` (inside assertions). |
| `tests/support/unit/account-view.ts` | `accountView(USER)` shapes the `GET /account` fixture response. |

## Notes

- The mock is deliberately minimal: only the transport is faked. If a test fails, the cause is in the store logic or a higher layer, not in a mis-shaped mock.
- `updateProfile` assertions verify that `role` and `imageUrl` are **stripped** before hitting the wire — the store is the sole enforcement point for "a user cannot self-promote."
- The deletion test calls the **real** `login` first; omitting that step means the session store has no token to tear down, and the assertion on `session.accessToken === undefined` would pass vacuously.
- `downloadAccountExport` expects a `File` instance (the transport layer hands over the binary as a `File`), not a JSON envelope — the `Content-Disposition` filename is part of the contract.
- `beforeEach` resets Pinia (`setActivePinia(createPinia())`) and clears all mocks, so each test starts from a clean store and an empty call history.
