---
source: src/modules/account/tests/profile-guest-consent-sync.spec.ts
sha256: 1fddbd278086f3cbe153f919c8439bc0ec04423d630b93f140c30682d76256a6
generated_at: 2026-10-17T00:25:33.219084+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-guest-consent-sync.spec.ts

## Purpose

Tests the login-time consent-sync path: when a guest who already answered the analytics consent banner authenticates into an account that has **no** `analyticsConsent` field, the guest's choice is persisted via `PATCH /account` exactly once. Mocks only the HTTP transport; the guest choice flows through the real `useAnalyticsConsentStore`.

## Key elements

- **`NEVER_ASKED_USER`** – Fixture for an account shape that has no `analyticsConsent` key (the only shape that can trigger a sync).
- **`responses`** – Per-test mutable map of `METHOD /url` → response body, read by the transport mock.
- **`patchBodies()`** – Helper that filters `orvalMutator` mock calls to `PATCH` and returns their `data` payloads in order.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a function that resolves `parseOrvalFixture(method, url, responses[key])`.
- **`beforeEach`** – Resets Pinia, clears mocks, deletes the `analyticsConsent` cookie via `deleteCookie`, and seeds default `GET /account`, `PATCH /account`, and `GET /account/abilities` responses.
- **`afterEach`** – Calls `vi.unstubAllEnvs()` to clean up `VITE_UMAMI_*` / `VITE_FARO_*` stubs.
- **6 `it` cases** – Cover: no analytics configured → no PATCH; guest never answered → no PATCH; account already has a preference → no PATCH; grant → PATCH `true`; deny → PATCH `false`; repeated `fetchProfile(true)` → PATCH fires only once.

## Relationships

- **`src/modules/account/stores/profile.ts`** – System under test; `useProfileStore().fetchProfile(true)` is the trigger that initiates the consent-sync logic.
- **`src/infrastructure/http/index.ts`** – Provides `orvalMutator`, the HTTP transport that is fully mocked here.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register test doubles with the app's dependency graph before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Supplies `orvalEnvelope` (wraps a payload in the orval response shape) and `parseOrvalFixture` (re-parses the envelope for the mocked transport).

## Notes

- The "never-asked" condition is specifically the **absence** of the `analyticsConsent` key on the user object, not an explicit `null`/`false`.
- `document.cookie` persists across tests in jsdom, so `deleteCookie('analyticsConsent')` in `beforeEach` is required to simulate a fresh guest session.
- `GET /account/abilities` must be provided in `responses` because `setViewer` (inside `fetchProfile`) unconditionally fetches it for every loaded profile.
- The same transport-mocking pattern is shared with `profile.spec.ts`; the distinguishing factor here is that the consent store is **real**, not mocked.
