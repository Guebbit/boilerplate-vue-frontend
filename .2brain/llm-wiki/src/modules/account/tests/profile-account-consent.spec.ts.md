---
source: src/modules/account/tests/profile-account-consent.spec.ts
sha256: d0d571997b1bac65f82097cca1bb3aff785215fc5b918d3da55407c1429ee1ce
generated_at: 2026-10-17T00:24:12.644760+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-account-consent.spec.ts

## Purpose

Verifies that while signed in, analytics consent is written to the account record (`PATCH /account`) rather than the guest cookie, and that signing out hands the consent banner back to cookie-based tracking. Only the HTTP transport is mocked; the consent, profile, and auth stores run as real Pinia instances.

## Key elements

- **`signInHolding(analyticsConsent?)`** – Signs in for real (login + `fetchProfile(true)`) with the account record carrying the given `analyticsConsent` value (`undefined` = never asked).
- **`patchBodies()`** – Collects every `data` payload the mocked transport received for `PATCH` calls, in order, for assertions.
- **`responses`** – Mutable `Record<string, unknown>` keyed by `"METHOD /url"`; each test overwrites entries to control the next canned HTTP reply.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a stub that resolves through `parseOrvalFixture` against `responses`.
- **`describe('the account answer while signed in')`** – Six cases: banner hidden when account has an answer; banner shown when neither source has one; deny writes account only; grant writes account only; logout reverts to cookie; guest grant still writes cookie with no account call.
- **`beforeEach`** – Fresh Pinia, cleared mocks, `vi.stubEnv` for Umami vars, `deleteCookie('analyticsConsent')`, and default `responses` for login/patch/abilities.

## Relationships

- **`src/infrastructure/http/index.ts`** – The module under mock; `orvalMutator` is the single transport boundary faked for the whole suite.
- **`src/modules/account/stores/auth.ts`** – `useAuthStore()` drives real login and logout flows in every signed-in test.
- **`src/modules/account/stores/profile.ts`** – `useProfileStore()` triggers the real `fetchProfile` call after login.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is invoked at module scope to wire stores/services before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (shapes fixture payloads) and `parseOrvalFixture` (validates + parses inside the transport mock).

## Notes

- The consent store (`@/infrastructure/analytics-consent.ts`) is **not** in the graph-neighbor list but is a real, un-mocked dependency exercised by every test.
- `vi.waitFor` is required because consent actions (grant/deny) update the store asynchronously; plain `expect` immediately after would race.
- Env stubs (`VITE_UMAMI_*`) are restored via `vi.unstubAllEnvs()` in `afterEach`—forgetting this would leak into sibling test files.
- Stores are imported via relative paths (`../stores/profile.ts`) while infrastructure uses the `@/` alias; the mock path must match the alias form.
