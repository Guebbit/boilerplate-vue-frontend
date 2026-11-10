---
source: src/modules/account/tests/profile-guest-consent-sync.spec.ts
sha256: 0af6da1058814bc651d85727276f0754a475013f7f7a546d3255e9e4882ddbcf
signature: 68171e9ab7390a21dca695463b819ae11aac8f7f8f33c65ea029adfcd89660e0
generated_at: 2026-11-10T03:39:34.210137+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-guest-consent-sync.spec.ts

## Purpose

Tests the login-time consent-sync flow: when a guest who already answered the analytics consent banner authenticates into an account that has never recorded its own `analyticsConsent` preference, that choice is persisted via `PATCH /account` exactly once. Only the HTTP transport is mocked; the consent store itself runs for real.

## Key elements

- **`NEVER_ASKED_USER`** – Minimal user fixture with no `analyticsConsent` key; the only shape that can trigger a sync.
- **`responses`** – Mutable `Record<string, unknown>` keyed by `METHOD /url`; each test sets the canned server replies before acting.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a function that looks up `responses` and pipes the result through `parseOrvalFixture`.
- **`patchBodies()`** – Helper that filters the mock's call log for `PATCH` requests and returns their `data` payloads in order.
- **`beforeEach`** – Resets Pinia, clears mocks, deletes the `analyticsConsent` cookie (jsdom keeps cookies across tests within a file), and resets `responses` to the default GET/PATCH pair.
- **`describe('the guest-consent sync')`** – Six cases covering: no analytics configured, guest never answered, account already has a preference, granted choice saved, denied choice saved, and single-fire across repeated `fetchProfile` calls.

## Relationships

- **`src/modules/account/stores/profile.ts`** – The system under test; `useAccountProfileStore().fetchProfile(true)` is the action that triggers the sync logic.
- **`src/infrastructure/http/index.ts`** – Mocked at the transport level; its `orvalMutator` export is the single network boundary the suite intercepts.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register the stores/services needed by the test environment.
- **`tests/support/unit/account-view.ts`** – `accountView()` shapes the `GET /account` fixture response.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture()` normalises the canned response into the shape `orvalMutator` would return in production.

## Notes

- The consent store (`useAnalyticsConsentStore`) is **not** mocked; the suite exercises the real store logic against a real Pinia instance.
- `deleteCookie('analyticsConsent')` in `beforeEach` is required because jsdom persists `document.cookie` for the entire file, not per-test (same rationale as `session.spec.ts`).
- Each test stubs `VITE_UMAMI_WEBSITE_ID` and related env vars via `vi.stubEnv` to simulate "analytics configured" vs. "not configured" — the sync path is gated on at least one analytics provider being present.
- The "fires only once" guarantee is verified by calling `fetchProfile(true)` twice sequentially and asserting `patchBodies().length === 1`.
