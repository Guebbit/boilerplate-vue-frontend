# src/modules/account/tests/auth-signup.spec.ts

## Purpose

Unit tests for `useAuthStore().signup` that pin the JSON-vs-multipart branch selection and verify the exact request shape sent to `/account/signup`. The spec exists because a store that silently always chose the JSON client would pass a shape-only test but break avatar uploads; these tests assert the branch *and* the body encoding.

## Key elements

- **`lastRequest()`** — extracts the axios config (url, method, data) from the most recent `orvalMutator` mock call; throws if the mutator was never invoked.
- **`lastFormData()`** — same as above but asserts the body is a `FormData` instance and returns it for field-level assertions.
- **`IMAGE()`** — factory returning a fresh `File` (`avatar.png`, `image/png`) for the optional `imageUpload` field.
- **`CREDENTIALS`** — a fully-specified signup payload (email, password, username, passwordConfirm) used by the multipart and progress-callback cases.
- **`describe('useAuthStore.signup')`** — five test cases plus one id-stability check:
  - JSON POST when no image is attached.
  - Multipart POST to the same endpoint when an image is present.
  - All scalar fields (not just the file) land in the `FormData` body.
  - The `username` default (`email`) is applied on *both* branches.
  - `onUploadProgress` is forwarded as the second argument to `orvalMutator`.
  - Store `$id` remains `'accountAuth'` (guards Pinia keying / persistence).

## Relationships

- **`src/infrastructure/http/index.ts`** — the test mocks `orvalMutator` (exported from this module) via `vi.mock('@/infrastructure/http', …)`. This is the *only* mocked boundary: the generated orval client (`@api`) is left unmocked so the real multipart-encoding logic under test executes. Every assertion inspects the config object passed into `orvalMutator`, i.e., the request as it would hit the network.

## Notes

- The deliberate choice to mock the transport rather than the generated client is called out in the module doc-comment; a future refactor that inlines the client into the store would invalidate the "real multipart encoding" guarantee these tests rely on.
- `beforeEach` calls `vi.clearAllMocks()` *and* creates a fresh Pinia instance, so test order is irrelevant and no state leaks between cases.
- The `username`-default test runs the JSON case first, then the multipart case in the same `it`, to catch a default that is applied only in one branch.
