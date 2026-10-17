---
source: src/modules/account/tests/two-factor-enroll-countdown.spec.ts
sha256: 81f6a6a1f06abd04bfa803776326b244ff5536781f2966c4aed3dc6f2fe3cf25
generated_at: 2026-10-17T00:27:29.277776+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-enroll-countdown.spec.ts

## Purpose

Component-level accessibility test for `TwoFactorEnroll.vue`. It verifies that the visible countdown ticker (the "expires in …" paragraph) is kept **outside** any ARIA live region, while a dedicated `[role=status]` element exists to announce state changes. This complements `two-factor-challenge-view.spec.ts` (same pattern for the login challenge view) and `use-countdown.spec.ts` (unit-level proof of the shared announcement logic).

## Key elements

- **`mountEnroll()`** – Helper that pre-sets a canned `POST /account/2fa/methods/email/setup` response (via the `responses` record) and mounts `TwoFactorEnroll` with the `email` method prop, Vuetify, and i18n plugins attached to `document.body`.
- **`responses` (module-level `Record<string, unknown>`)** – Lookup keyed by `"METHOD /url"` that the mocked `orvalMutator` consults on every call. Each test (or the helper) overwrites it before acting.
- **`vi.mock('@/infrastructure/http', …)`** – Replaces `orvalMutator` with a stub that returns `parseOrvalFixture(method, url, responses[key])`, so no real HTTP or Orval-generated client is exercised.
- **`describe('TwoFactorEnroll — the delivered code countdown')` / single `it`** – Asserts that `p.opacity-70:not([role])` exists and contains "expires in", and that a separate `[role=status]` element is present.
- **`beforeEach` / `afterEach`** – Clears `document.body` and loads the `en` locale (restored after each test).

## Relationships

- **`src/modules/account/components/TwoFactorEnroll.vue`** – The SUT; mounted directly with `method: 'email'`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope so that Vuetify/other plugin registrations resolve correctly before mounting.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Supplies `orvalEnvelope` (builds a standard response envelope) and `parseOrvalFixture` (validates/normalises the canned body) used inside the HTTP mock.

## Notes

- The test uses a `flushPromises().then(…)` promise chain rather than `async/await`; keep that pattern if extending the file.
- `attachTo: document.body` is required for Vuetify's DOM queries; omitting it will cause `wrapper.find` to miss rendered content.
- The mock is keyed by a `"METHOD /url"` string (e.g. `"POST /account/2fa/methods/email/setup"`). Adding a new endpoint test means adding a matching key to `responses` before the action under test.
- This spec intentionally does **not** test the countdown tick interval or the composable's announcement text — those are covered by `use-countdown.spec.ts`. Only the DOM separation (visual text vs. live region) is asserted here.
