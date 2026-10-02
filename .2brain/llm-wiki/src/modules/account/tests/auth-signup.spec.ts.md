---
source: src/modules/account/tests/auth-signup.spec.ts
sha256: 66e9a20db5ee626f91b9a1b8b0d8df80c52a71cea882b051224b6bb58279159d
generated_at: 2026-10-02T12:21:35.033444+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-signup.spec.ts

## Purpose

Unit tests that pin the exact HTTP requests produced by `useAuthStore().signup()` and its avatar follow-up (`setAvatarAfterSignup`). They assert request URL, method, body shape (JSON vs. multipart), and forwarded options, without mocking the generated API client itself.

## Key elements

- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a stub that records each axios config and resolves a parsed fixture via `parseOrvalFixture`.
- **`lastRequest()`** — returns the axios config object from the most recent `orvalMutator` call.
- **`lastRequestTo(method, url)`** — finds the most recent call matching a specific method + URL pair (needed because the avatar PATCH is followed by refetches).
- **`avatarFormData()`** — extracts the PATCH `/account` body and asserts it is a `FormData` instance.
- **`IMAGE()`** — factory returning a fresh `File` per call, used as the avatar upload payload.
- **`CREDENTIALS`** — constant with all scalar signup fields, used by tests that are not about defaults.
- **`describe('useAuthStore.signup')`** — the test block; each `it` exercises one request-contract assertion (JSON body fields, username defaulting, multipart avatar, upload-progress forwarding, store `$id` stability).

## Relationships

- **`src/infrastructure/http/index.ts`** — the module under test's transport layer. Its `orvalMutator` export is the single spy; everything the test asserts is about the config object passed to it.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register the necessary module wiring so the Pinia store and its dependencies resolve in the unit-test environment.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `contractRequest` (validates a request body against an API schema), `orvalEnvelope` (wraps a minimal response), and `parseOrvalFixture` (selects the right fixture for a method+URL). All three are used by the mock and the assertions.

## Notes

- The generated API client (`@api`) is deliberately **not** mocked. The multipart encoding that matters lives inside the generated client code, so only the transport (`orvalMutator`) is intercepted. This means the tests actually exercise the client's `FormData` construction.
- Signup is strictly JSON — the API accepts no image from a stranger. The avatar is a separate follow-up `PATCH /account`. A store that still built multipart at signup would fail the `not.toBeInstanceOf(FormData)` assertion.
- `lastRequestTo` uses `findLast` rather than `at(-1)` because refetches fire after the avatar PATCH; grabbing the absolute last call would give the wrong request.
- The `$id` stability test (`'accountAuth'`) exists because no other assertion in the suite would detect a store-id rename (all tests reach the store through `useAuthStore()`).
