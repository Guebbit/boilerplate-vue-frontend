# src/modules/account/tests/auth-signup.spec.ts

## Purpose

Unit tests for the `signup` action on the auth store. They pin down which HTTP client branch (JSON vs. multipart `FormData`) is chosen based on the presence of `imageUpload`, assert the exact request that reaches the transport (URL, method, body shape), and verify that shared invariants (username default, progress-callback forwarding) hold on both branches. The generated API client is deliberately **not** mocked so that the real multipart encoding is exercised.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a resolver that returns a fixed user object; the only transport-level mock.
- **`lastRequest()`** — helper that extracts the most recent axios-config argument passed to `orvalMutator`.
- **`lastFormData()`** — asserts the last request body is a `FormData` instance and returns it.
- **`IMAGE()`** — factory returning a fresh `File` (`avatar.png`, `image/png`) for the optional upload field.
- **`CREDENTIALS`** — fully-specified signup payload (email, password, username, passwordConfirm) used by the "all fields present" cases.
- **`describe('useAuthStore.signup', …)`** — the test suite; resets Pinia and mocks in `beforeEach`.
- **Test cases:**
  - JSON body (no `imageUpload`) → `POST /account/signup`, plain object data.
  - Multipart body (with `imageUpload`) → same URL, `FormData` with a `File` under `imageUpload`.
  - All scalar fields carried into the `FormData`, not just the file.
  - Username defaults to email on **both** the JSON and multipart branches.
  - `onUploadProgress` option forwarded as the second argument to `orvalMutator`.
  - Store `$id` is `'accountAuth'` (guards against accidental key renames).

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole mocked dependency. The module under test (`useAuthStore`) calls `orvalMutator` as its transport; the mock intercepts that call so assertions inspect the outgoing request config rather than a network response.

## Notes

- The generated API client (`signupWithMultipart`, `signupWithJson`) is **intentionally un-mocked**; mocking it would make the multipart-encoding assertions circular.
- The username-default test exists because a JSON-only default that the multipart branch silently dropped would be invisible to any shape-only check.
- The `$id` test is the only guard against a store-key rename; no other test in this file would notice a changed ID since they all go through `useAuthStore()`.
