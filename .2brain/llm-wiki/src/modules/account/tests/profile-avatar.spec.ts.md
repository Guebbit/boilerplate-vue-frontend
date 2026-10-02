---
source: src/modules/account/tests/profile-avatar.spec.ts
sha256: 973d677c3b71a8687976c586179116af15e6f69f2074aaac8556ef5e4c650c83
generated_at: 2026-10-02T12:28:39.186788+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-avatar.spec.ts

## Purpose

Unit tests covering the avatar-specific branches of `useProfileStore().updateProfile`: the multipart `imageUpload` path, the plain-JSON `imageUrl: null` removal path, and the per-path loading flags (`uploadingAvatar`, `removingAvatar`) that the two avatar buttons depend on. It is deliberately split out from `profile.spec.ts` so that the picture logic is tested in isolation.

## Key elements

- **`wireModulesIntoCore()`** — called at module top level to register the test DI graph before any store is instantiated.
- **`orvalMutator` mock** — replaces `@/infrastructure/http` with a `vi.fn` that routes on `METHOD /url` and returns a parsed fixture from the `responses` map.
- **`responses`** (reset in `beforeEach`) — the HTTP fixtures for `GET /account`, `GET /account/abilities`, and `PATCH /account`.
- **`calls()`** — helper that extracts every recorded `orvalMutator` call config (url, method, headers, data) for assertion.
- **`gateNextCall()`** — swaps in a one-shot `mockImplementationOnce` that suspends the next transport call on a deferred promise; returns a `release()` function so tests can assert mid-flight loading state.
- **`describe` blocks** — three groups: "an imageUpload switches the call to multipart", "removing the picture", and "each avatar path owns its loading key".

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole module under test at the transport layer; the file mocks `orvalMutator` from this entry point to intercept every outgoing HTTP call.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, which binds the mocked transport into the DI container the Pinia store resolves against.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `parseOrvalFixture` (used inside the mock to shape responses), `orvalEnvelope` (to wrap fixture payloads), and `contractRequest` (to validate a request body against `@api/schemas`).
- **`tests/unit/ui/human-check.spec.ts`** — no direct import or runtime interaction visible in this file.

## Notes

- **PATCH, not PUT.** The fixture keys and assertions use `PATCH /account`; a comment references ticket AUDIT_0924 D17d.
- **Multipart cannot carry `null`.** When `updateProfile` receives both `imageUpload` and a nullable field (e.g. `phone: null`), the store issues a second plain-JSON PATCH for the clear. Tests assert exactly two PATCH calls in that scenario.
- **`imageUrl: ''` is contract-invalid.** The schema enforces `minLength: 1`; only `null` is a valid "remove" value.
- **Loading flags are async to observe.** The composable cancels in-flight queries before raising its flag, so tests use `vi.waitFor` rather than a synchronous check after the call.
- **Split rationale.** The file header explicitly notes that `profile.spec.ts` covers all other fields of the same action; this file exists solely for the picture.
