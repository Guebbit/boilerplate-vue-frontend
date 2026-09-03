# src/modules/account/tests/profile.spec.ts

## Purpose
Unit tests for the `useProfileStore` flows (fetch, update, role change, password change, email verification, account deletion). Only the HTTP transport is mocked; the generated client, `session.ts`, the observability store, and `useStructureRestApi` all execute for real.

## Key elements
- **`responses` (module-level `Record<string, unknown>`)** — keyed by `"METHOD /path"`, rebuilt in `beforeEach`. Tests override individual entries rather than re-mocking the module.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a `vi.fn` that looks up `responses` by the request's method + URL and resolves the matching value.
- **`requestedUrls()`** — helper that extracts the ordered list of URLs handed to the transport, used to assert call order and endpoint selection.
- **`USER`** — a fixed representative user record (`id: 'u1'`, `username: 'ada'`, `admin: false`) shared across fetch/update/role assertions.
- **`describe` blocks** — one per store action: `fetchProfile`, `updateProfile`, locale preference, `own role`, `the account deletion flow`, `the self-service actions` (changePassword, confirmEmailVerification).
- **`beforeEach`** — resets Pinia (`setActivePinia(createPinia())`), clears all mocks, and reinitialises `responses` to the canonical set of endpoints.

## Relationships
- **`src/infrastructure/http/index.ts`** — the sole import that is *mocked*. The test replaces `orvalMutator` so that every HTTP call from the real client layer resolves against the in-test `responses` map. All other imports (`useProfileStore`, `useAuthStore`, `useSessionStore`) run un-mocked.

## Notes
- Tests that require an established session (e.g. `updateOwnRole` refetch, deletion flow) call the **real** `useAuthStore().login()` first — they do not manually seed the session store.
- The mock key is `METHOD /path` (uppercased method + URL). A 404 (missing key) resolves `undefined`, which is how the "no payload" negative cases are expressed.
- `updateProfile` intentionally strips the `admin` field before the wire call; the test asserts the exact key set on the `PUT /account` body to pin that guard.
- Role changes go to `PUT /users/{id}` (admin-guarded), *not* `PUT /account`; the test asserts the URL to prevent silent routing regressions.
- The file is truncated in the source provided; the `confirmEmailVerification` describe block's second case is cut off mid-assertion.
