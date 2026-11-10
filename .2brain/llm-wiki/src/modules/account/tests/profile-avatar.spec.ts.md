---
source: src/modules/account/tests/profile-avatar.spec.ts
sha256: 9a0665fdf4771c1095bd0a57345647322bc027e831f0242c426a13006f401bc9
signature: 22babf36733869276098e52b7ea530e0fad31266c62083a7df766ee63257ffeb
generated_at: 2026-11-10T03:38:57.855004+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-avatar.spec.ts

## Purpose

Unit tests for the avatar-specific branches of `useAccountProfileStore.updateProfile`: multipart file upload, `onUploadProgress` forwarding, the plain-JSON `imageUrl: null` removal path, and the per-path loading flags (`uploadingAvatar` / `removingAvatar`) that distinguish avatar writes from ordinary field saves. Split out from `profile.spec.ts` so the larger file can focus on every other field of the same action.

## Key elements

- **`USER`** – Canned signed-in user (`u1` / `ada`) used as the seed for `GET /account`.
- **`responses`** – Per-test map of `METHOD /url` → canned body; each test overwrites it before acting.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a stub that routes through `parseOrvalFixture` and records every call.
- **`calls()`** – Returns the recorded `orvalMutator` invocations (config + options) for assertion.
- **`gateNextCall()`** – Swaps in a one-shot implementation that suspends the next transport call behind a manual `Promise`, letting tests read loading flags mid-flight.
- **`describe('an imageUpload switches the call to multipart')`** – Verifies `Content-Type: multipart/form-data`, `FormData` payload, absence of stale `imageUrl`, the two-PATCH split when a field is also nulled, `onUploadProgress` passthrough, and the post-write `GET /account` refetch.
- **`describe('removing the picture')`** – Confirms `imageUrl: null` travels as plain JSON (not multipart, not empty string).
- **`describe('each avatar path owns its loading key')`** – Asserts `uploadingAvatar` / `removingAvatar` / `loading` are set exclusively per path while the call is in flight.

## Relationships

- **`src/modules/account/stores/profile.ts`** – The unit under test; imports `useAccountProfileStore` and exercises `fetchProfile`, `updateProfile`, `uploadingAvatar`, `removingAvatar`, `loading`.
- **`src/infrastructure/http/index.ts`** – Mocked at module level; `orvalMutator` is the sole transport seam the tests observe.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register the Orval-generated client modules in the DI container before any test runs.
- **`tests/support/unit/orval-fixture-schema.ts`** – Provides `parseOrvalFixture` (used inside the mock to shape responses) and `contractRequest` (used to assert outgoing wire payloads against the API schema).
- **`tests/support/unit/account-view.ts`** – `accountView(USER)` builds the `GET /account` response body, including the CASL rules the store unpacks.

## Notes

- **PATCH, not PUT.** `updateProfile` sends only the fields it was handed, so the expected verb is `PATCH /account`.
- **Two-PATCH split.** When an `imageUpload` is accompanied by a `null` field (e.g. `phone: null`), the store issues a multipart PATCH *and* a second plain-JSON PATCH for the null, because `FormData` cannot express JSON `null`.
- **`imageUrl: null` is the only valid removal value.** The contract's `minLength: 1` rejects `''` with a 422; the test documents this explicitly.
- **Loading flags are async.** The composable cancels in-flight queries *before* raising the flag, so the flag is not set synchronously with the `updateProfile` call—hence the `gateNextCall` + `vi.waitFor` pattern in the loading-key tests.
- **`human-check.spec.ts`** appears in the dependency graph but has no direct import or interaction in this file.
