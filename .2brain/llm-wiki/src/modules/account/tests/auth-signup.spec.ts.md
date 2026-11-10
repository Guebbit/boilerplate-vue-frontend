---
source: src/modules/account/tests/auth-signup.spec.ts
sha256: 5b7a63654ec9b39395de633c18eb10747601fc618425f0591230a26d417843fe
signature: 70b0492a9e4a1bc6b46c43b5d4e4f6730a1d1f54e56512a0e9dca07776a4c5b1
generated_at: 2026-11-10T03:30:59.325566+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/auth-signup.spec.ts

## Purpose

Unit tests for `useAccountAuthStore.signup` and its avatar follow-up (`setAvatarAfterSignup`). Pins the exact HTTP request each action emits: signup is a JSON `POST /account/signup`; a picked avatar is a separate multipart `PATCH /account`. The generated client (`@api`) is **not** mocked — the transport layer (`orvalMutator`) is, so every assertion inspects the real request that would go over the wire.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a spy that resolves `parseOrvalFixture` responses (account view or config answer). This is the only network boundary replaced.
- **`lastRequest()`** — returns the axios config from the most recent `orvalMutator` call.
- **`lastRequestTo(method, url)`** — finds the most recent call matching a specific method + URL (needed because the avatar PATCH is followed by refetches).
- **`avatarFormData()`** — asserts the `PATCH /account` body is a `FormData` instance and returns it.
- **`IMAGE()`** — factory producing a fresh `File` per test (avoids shared-reference mutations).
- **`CREDENTIALS`** — a fully-specified signup payload used by tests that are not about defaults.
- **`describe('useAccountAuthStore.signup', …)`** — the test block covering: JSON-only body, all scalar fields, username-defaults-to-email, avatar as follow-up multipart PATCH, `onUploadProgress` forwarding, and stable Pinia store ID (`'account-auth'`).

## Relationships

- **`src/modules/account/stores/auth.ts`** — the system under test; `useAccountAuthStore` is imported directly and exercised in every test.
- **`src/infrastructure/http/index.ts`** — mocked at module level; its `orvalMutator` export is the sole transport replacement.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `parseOrvalFixture` (response parsing inside the mock) and `contractRequest` (schema-based request-body validation in assertions).
- **`tests/support/unit/account-view.ts`** — supplies the `accountView` fixture returned for non-`/config` responses.
- **`tests/support/unit/config-answer.ts`** — supplies the `configAnswer` fixture for the `/config` response branch.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to set up the DI container before tests run.

## Notes

- The test file deliberately does **not** mock `@api` (the generated Orval client). This is intentional: the multipart `FormData` encoding lives in that client, and the spec pins that encoding end-to-end down to the transport boundary.
- `vi.clearAllMocks()` in `beforeEach` resets call history; `setActivePinia(createPinia())` gives each test a fresh store instance.
- The avatar test uses `setAvatarAfterSignup` (not `setAvatar`) because the flow is tied to the just-minted token — the store distinguishes the two contexts.
- The store ID assertion (`$id === 'account-auth'`) is a regression guard for Pinia keying, devtools, and any persistence plugin; no other test would catch a rename.
