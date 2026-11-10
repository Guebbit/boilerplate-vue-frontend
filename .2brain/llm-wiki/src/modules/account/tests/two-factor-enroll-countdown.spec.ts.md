---
source: src/modules/account/tests/two-factor-enroll-countdown.spec.ts
sha256: 9c2184e7d2ad0c9579101bc87bf60f08229340ed3e8920f8d92d8b31707ad36f
signature: ea50f906ff6d5461df23f1784cd8697c8c374929bbd56b725d2e5b104d58c597
generated_at: 2026-11-10T03:42:58.294937+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-enroll-countdown.spec.ts

## Purpose

Verifies the accessibility fix on `TwoFactorEnroll.vue` for the delivered-method setup code: the visible countdown text must live outside any ARIA live region, with a separate `role="status"` element available for screen-reader announcements. Complements `two-factor-challenge-view.spec.ts` (same fix on the challenge view) and `use-countdown.spec.ts` (the shared announcement logic itself).

## Key elements

- **`mountEnroll()`** – Sets canned `POST /account/2fa/methods/email/setup` response, creates a fresh Pinia, and mounts `TwoFactorEnroll` with `method: "email"` plus Vuetify/i18n plugins.
- **`responses`** – Module-level `Record<string, unknown>` keyed by `"METHOD /url"`; each test overwrites it before acting.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a stub that resolves `parseOrvalFixture(method, url, responses[key])`, so no real HTTP is made.
- **`describe("TwoFactorEnroll — the delivered code countdown")`** – Single `it` asserting:
  - `p.opacity-muted:not([role])` exists and contains the text "expires in".
  - A `[role=status]` element also exists (the dedicated live region).

## Relationships

- **`src/modules/account/components/TwoFactorEnroll.vue`** – The component under test; mounted directly with `method: "email"`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module load to register module wiring before any test runs.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` validates/normalises the canned JSON against the Orval-generated schema so test fixtures match the real API contract.

## Notes

- The selector `p.opacity-muted:not([role])` is intentional: it pins the test to the *visible* ticking paragraph specifically, not the `role="status"` sibling. If a developer accidentally adds `role` to the ticking `<p>`, this assertion fails.
- `resendAfter: 30` in the canned response drives the countdown duration; `expiresAt` is set to ~5 min ahead of `Date.now()` to avoid expiry edge cases during the test.
- `loadLocale('en')` is called in both `beforeEach` and `afterEach` to guarantee a known locale and to reset i18n state between tests.
