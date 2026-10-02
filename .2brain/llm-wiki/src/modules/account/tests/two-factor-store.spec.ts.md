---
source: src/modules/account/tests/two-factor-store.spec.ts
sha256: 4c1ad6c9e4fc108986ac9266e675009fcbdc83d9befdb70120e40be5fa5c09d8
generated_at: 2026-10-02T14:52:13.634062+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-store.spec.ts

## Purpose

Unit tests for the `useTwoFactorStore()` Pinia store, covering the enrollment flow (setup → confirm → backup codes), the login-time challenge (send → submit), the `resendAfter` countdown, and 429 rejection surfacing. Mocks only the HTTP transport layer (`orvalMutator`), following the same pattern as `sessions.spec.ts` and `auth-session.spec.ts`.

## Key elements

- **`RejectWith` / `isRejectWith`** — marker interface and type-guard so a mocked response entry can signal "reject this call" with an arbitrary payload (used for 429 and 400 cases).
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses[key]` (keyed by `METHOD url`), resolving via `parseOrvalFixture` or rejecting via `__reject`.
- **`gateNextCall()`** — holds the next transport call open behind a Promise so a test can assert a loading flag mid-flight, then releases it.
- **`requestedUrls()`** — extracts all URLs from `orvalMutator` mock calls, used to assert that writes are not served from a store-level cache.
- **`beforeEach`** — resets Pinia, clears mocks, and seeds default responses for `GET /account/abilities` (required by the session store) and `GET /account/2fa`.
- **`describe` blocks** — `fetchStatus`, `the enrollment machine`, `every write reaches the API each time`, and (truncated) the login-time challenge and 429 surfacing.

## Relationships

- **`@/infrastructure/http`** (`src/infrastructure/http/index.ts`) — the sole external dependency under test; fully mocked via `vi.mock`. The mock inspects `config.url` and `config.method` to route responses.
- **`tests/support/unit/wire-modules.ts`** — called once at module scope (`wireModulesIntoCore()`) to register DI/module wiring so the store and session store can resolve their dependencies in the test environment.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wrap a plain object in the API response envelope), `parseOrvalFixture` (validate/parse a raw response against the Orval schema), and `contractRequest` (exported but not visibly used in the truncated portion).

## Notes

- Every assertion that a value is *not* cached on the store (e.g. `expect(store).not.toHaveProperty('setup')`) is intentional: the store is designed to be stateless for one-shot payloads and only keep `status` + `delivery` as persistent fields.
- The 429 test asserts that the store **starts** the `secondsUntilResend` countdown from the server's `retryAfter` even though the call rejected — the caller still receives the rejection to render its own UX.
- The "every write reaches the API each time" block guards against a regression where the store would memoize and skip the HTTP call on repeated invocations.
- `GET /account/abilities` must always be in the `responses` map whenever a logged-in context is exercised; forgetting it causes a silent session-store failure rather than a clear test error.
