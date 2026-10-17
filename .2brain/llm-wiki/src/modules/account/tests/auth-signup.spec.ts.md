---
source: src/modules/account/tests/auth-signup.spec.ts
sha256: dbe00783b393eab9d8f7c620661b2ecc949e87c9b32afeb3cf91e3f811540efe
generated_at: 2026-10-17T00:21:14.408999+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-signup.spec.ts

## Purpose
Unit tests for the auth store's `signup` action and the `setAvatarAfterSignup` follow-up. They pin the exact HTTP request (method, URL, body shape, encoding) each action produces against the generated API schemas, without mocking the `@api` client itself.

## Key elements
- **`lastRequest()`** — Returns the axios config from the most recent `orvalMutator` call; throws if the mutator was never invoked.
- **`lastRequestTo(method, url)`** — Finds the most recent call matching a specific method+URL pair (needed because the avatar PATCH is followed by refetches).
- **`avatarFormData()`** — Extracts the body of the last `PATCH /account` call and asserts it is a `FormData` instance.
- **`IMAGE()`** — Factory returning a fresh `File` object (`avatar.png`, `image/png`) for each test call.
- **`CREDENTIALS`** — A fully-specified signup payload (email, password, username, passwordConfirm, termsAccepted) used by tests that are not about defaults.
- **`describe('useAuthStore.signup')`** block — Six tests covering: JSON-only body, all scalar fields, username defaulting to email, avatar as a separate multipart `PATCH /account`, `onUploadProgress` forwarding, and the store's `$id` being `'accountAuth'`.

## Relationships
- **`src/modules/account/stores/auth.ts`** — The unit under test; `useAuthStore` is the only export consumed.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is imported and replaced via `vi.mock` with a single canned response; tests assert on the call arguments, not the resolved value.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register Pinia and other core modules before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `parseOrvalFixture`, `orvalEnvelope` (used inside the mock factory) and `contractRequest` (used in assertions to validate request bodies against `@api/schemas.SignupBody`).

## Notes
- The `@api` generated client is deliberately **not** mocked. Only the transport layer (`orvalMutator`) is intercepted, so multipart encoding and JSON serialization exercised in tests are the real ones produced by the generated client.
- The mock always resolves with the same envelope (`{ id: 'u1', username: 'ada', email: 'ada@example.com'`); tests never assert on response content.
- `vi.clearAllMocks()` runs in `beforeEach`, so the "last call" helpers are safe to use without cross-test contamination.
- The store `$id` assertion (`'accountAuth'`) is a regression guard: Pinia devtools and any persistence plugin key on this string, and no other test would surface a rename.
