---
source: src/modules/account/tests/profile-avatar.spec.ts
sha256: d1e8214cc903b72839a705b4310252d6e15010d52fca04da67a7c2b04a70c4ae
generated_at: 2026-10-17T00:24:57.631446+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-avatar.spec.ts

## Purpose

Unit tests for the avatar-specific branches of `updateProfile` in the profile store: multipart file upload, `onUploadProgress` forwarding, the plain-JSON `imageUrl: null` removal path, and the per-path loading flags (`uploadingAvatar` / `removingAvatar`). Split out from `profile.spec.ts` because it covers only the picture concern.

## Key elements

- **Mock of `@/infrastructure/http`** — replaces `orvalMutator` with a stub that looks up a canned response from the `responses` map (keyed `METHOD /url`) and wraps it through `parseOrvalFixture`.
- **`responses`** — module-level `Record<string, unknown>` that each test configures before acting; defaults are set in `beforeEach` for `GET /account`, `GET /account/abilities`, and `PATCH /account`.
- **`calls()`** — extracts every `orvalMutator` invocation's config object (url, method, headers, data) for assertion.
- **`gateNextCall()`** — replaces the next `orvalMutator` call with a promise that resolves only when the returned release function is invoked, allowing tests to assert loading-flag state while the request is still in flight.
- **`describe` blocks** — three groups: multipart upload switching, `imageUrl: null` removal, and per-path loading-key isolation.
- **`USER`** — the signed-in user fixture the store starts from.

## Relationships

- **`src/modules/account/stores/profile.ts`** — the SUT; `useProfileStore` and its `updateProfile` / `fetchProfile` actions are exercised, and its `uploadingAvatar`, `removingAvatar`, and `loading` flags are asserted.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is the single transport seam the entire test mocks; no real HTTP occurs.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top to wire the DI container before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wrap a payload in the API envelope), `parseOrvalFixture` (the mock's response parser), and `contractRequest` (validate a request body against the orval schema before asserting shape).

## Notes

- **Two-PATCH "clear" path:** when `imageUpload` and a nullable field (e.g. `phone: null`) are passed together, the store emits *two* `PATCH /account` calls — one `FormData` (multipart) for the file, one JSON for the nulls. Multipart cannot carry a `null`, so this split is mandatory.
- **`PATCH`, not `PUT`:** the store sends only the fields it was given; the mock expects `PATCH /account`.
- **`vi.waitFor` for loading flags:** the composable cancels in-flight queries before raising the loading flag, so the flag is set on a later microtask. Synchronous assertions immediately after calling `updateProfile` will not see `true`.
- **`imageUrl` absence in FormData:** the multipart test explicitly asserts `(patch.data as FormData).has('imageUrl')` is `false` — the old field is dropped, not sent as an empty string.
- **Empty-string vs. `null`:** the contract's `minLength: 1` on `imageUrl` rejects `''` with a 422; `null` is the only "remove" value.
