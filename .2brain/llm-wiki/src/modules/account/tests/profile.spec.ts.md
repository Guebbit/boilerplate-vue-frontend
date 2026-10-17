---
source: src/modules/account/tests/profile.spec.ts
sha256: a61886dfa2c6839b22859f9e1b5341737907da14bbdc26497639f09ff9ab9844
generated_at: 2026-10-17T00:26:21.367463+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile.spec.ts

## Purpose

Unit tests for the `useProfileStore` covering fetch, update, locale persistence, the account-deletion flow, and the account-export flow. Only the HTTP transport (`orvalMutator`) is mocked; every layer above it — generated client, `session.ts`, observability store, `useStructureRestApi` — executes for real. Cases that need an authenticated session log in through the actual `useAuthStore().login`, mirroring production callers.

## Key elements

- **`responses`** — a mutable `Record<string, unknown>` map keyed by `"METHOD /path"`. Rebuilt in `beforeEach` so tests are isolated. A test that needs a non-default answer overwrites one key instead of re-mocking the module.
- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a function that looks up `responses[key]` and passes it through `parseOrvalFixture`, so the generated client sees a well-formed envelope.
- **`requestedUrls()`** — helper that extracts the ordered list of URLs handed to the transport, used for sequence assertions.
- **`beforeEach`** — resets Pinia (`createPinia`), clears mocks, and re-seeds `responses` with the canonical set of endpoint fixtures (login, `GET /account`, abilities, deletion, password, export, etc.).
- **`describe('fetchProfile')`** — verifies the store populates its own `profile` field, publishes the viewer to the session store without a prior login, and leaves the viewer untouched when the payload is empty.
- **`describe('updateProfile')`** — asserts rejection when no profile is loaded; verifies the PATCH goes to `/account` (self-service), strips admin-only fields like `role`, and sends only user-owned keys.
- **`describe('locale preference')`** — confirms `locale` is included in the PATCH body.
- **`describe('the account deletion flow')`** — two-phase: `requestAccountDelete` fetches the record + abilities without clearing the session; `confirmAccountDelete` hits `/account/delete-confirm` and wipes the session.
- **`describe('requestAccountExport')`** — asserts the `202` response shape (`{ id, status }`) and that the download endpoint returns the full export document (not an envelope).
- **`USER`** — a single representative user record reused across fetch/update/role assertions.

## Relationships

- **`src/modules/account/stores/profile.ts`** — the unit under test; every `it` block drives its actions (`fetchProfile`, `updateProfile`, `requestAccountDelete`, `confirmAccountDelete`, `requestAccountExport`).
- **`src/modules/account/stores/auth.ts`** — imported and called (`useAuthStore().login`) in the deletion and export tests to establish a real session before the profile action runs.
- **`src/infrastructure/http/index.ts`** — the sole mock target. `orvalMutator` is replaced so no real network call is made, but the rest of the HTTP pipeline (client, interceptors, envelope parsing) stays in the loop.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register the Pinia stores and DI wiring the tests depend on.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a body in the standard `{ success, status, data }` shape), `parseOrvalFixture` (re-parses the mock response as the generated client would), and `contractRequest` (validates a request body against an Orval schema for key-set assertions).

## Notes

- The mock keys on `METHOD /path`, not query params. If an endpoint gains a query parameter, the key will still match; if it moves to a path parameter, update the key accordingly.
- `GET /account/export/e1` is the one fixture that is **not** wrapped in `orvalEnvelope` — the real endpoint returns the export document bare. Don't "fix" it into the standard shape.
- The deletion test asserts `requestedUrls().slice(-2).toSorted()` because `fetchProfile` and `fetchAbilities` are fired without being sequentially awaited; their relative order is intentionally not pinned.
- The `updateProfile` key-set assertion uses `contractRequest(schemas.UpdateAccountBody, …)` to enumerate exactly which keys the generated schema permits on the wire, preventing accidental extra fields from leaking into the PATCH body.
