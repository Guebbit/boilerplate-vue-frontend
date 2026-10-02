---
source: src/modules/account/tests/profile-guest-consent-sync.spec.ts
sha256: 9ff64d6731eb4e2993626617d4332808e5f3e31287a1d137bed352aaec333895
generated_at: 2026-10-02T14:50:32.966609+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-guest-consent-sync.spec.ts

## Purpose

Vitest spec covering the login-time guest-consent sync (feature FA-D5): when a guest who answered the analytics consent banner authenticates into an account that has no `analyticsConsent` value of its own, the guest's choice is persisted via a single `PATCH /account` call. The spec exercises the real `useAnalyticsConsentStore` and `useProfileStore` logic while mocking only the HTTP transport layer.

## Key elements

- **`NEVER_ASKED_USER`** — minimal account fixture (`id`, `username`, `email`, `role`) with no `analyticsConsent` key; the one shape eligible to trigger a sync.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that routes on `METHOD url` into a `responses` record, parsing the stored fixture through `parseOrvalFixture`.
- **`patchBodies()`** — helper that filters the recorded `orvalMutator` calls to `PATCH` requests and extracts their `data` payloads for assertions.
- **`beforeEach`** — resets Pinia, clears mocks, deletes the `analyticsConsent` cookie (via `deleteCookie`), and seeds `responses` with default `GET /account`, `PATCH /account`, and `GET /account/abilities` fixtures.
- **`describe('the guest-consent sync')`** — six cases: no-op when Umami unconfigured, no-op when guest never answered, no-op when account already has a preference, sync of a granted choice, sync of a denied choice, and exactly-once across repeated `fetchProfile(true)` calls.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole mocked module; the test stubs `orvalMutator` so no real HTTP occurs.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level to register stores/dependencies in the test DI container before any `use*` call.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload in the orval response shape) and `parseOrvalFixture` (validates the raw fixture against the expected schema and returns the typed body) used by both the mock and the `beforeEach` seed.

## Notes

- Cookie state is **not** reset automatically: jsdom retains `document.cookie` for the entire file, so `deleteCookie('analyticsConsent')` runs explicitly in `beforeEach` (same pattern as `session.spec.ts`).
- `afterEach` calls `vi.unstubAllEnvs()` because several tests use `vi.stubEnv('VITE_UMAMI_WEBSITE_ID', …)`; omitting this would leak the stub into subsequent tests.
- The "exactly once" guarantee is asserted by calling `fetchProfile(true)` twice back-to-back and checking `patchBodies().length === 1`—the store tracks that a sync has already occurred for the session.
