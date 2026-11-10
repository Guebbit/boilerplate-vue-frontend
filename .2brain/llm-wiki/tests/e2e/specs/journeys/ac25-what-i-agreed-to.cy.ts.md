---
source: tests/e2e/specs/journeys/ac25-what-i-agreed-to.cy.ts
sha256: aad3df794c16859fdae06478eb4bdbca13f194da23fddcca60c003be1545a87f
signature: d4e0953808584e994b119de73b26f310d5cff94fc112617e72644d142f32cd8b
generated_at: 2026-11-10T06:48:01.629723+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac25-what-i-agreed-to.cy.ts

## Purpose

E2E journey test for AC25 ("What I agreed to"). Verifies that the signup form displays a live password-strength meter, rejects submission when the terms checkbox is unchecked, records `termsAcceptedAt` / `termsVersion` and the analytics-consent toggle with timestamps, and that a provider (OAuth) signup stamps the terms without soliciting an analytics answer.

## Key elements

- **`VISITOR`** – Constant holding the test user's email and password, used throughout both scenarios.
- **`Agreement`** – Interface describing the four account-record fields the story reads (`analyticsConsent`, `analyticsConsentAt`, `termsAcceptedAt`, `termsVersion`).
- **`agreementOf(device)`** – Helper that calls `GET /account` as a signed-in device and casts the body to `Agreement`, returning a `Cypress.Chainable`.
- **`describe('AC25 · What I agreed to')`** – Contains two `it` blocks:
  - *Standard signup* – Asserts strength-meter text, blocked submission without terms, successful signup with both checkboxes, timestamp freshness, analytics toggle-off updating the consent date while leaving the terms date unchanged.
  - *Provider (fake OAuth) signup* – Gated by `cy.skipUnlessDemo()`; asserts the OAuth notice is visible, an unknown identity signs up, and the resulting record has terms stamped but `analyticsConsentAt` is `null`.

## Relationships

- **`tests/support/e2e/security-steps.ts`** – Imports `loginDeviceWith` to obtain a `Device` handle for API-level assertions after UI-driven signup.
- **`tests/support/e2e/harness.ts`** – Imports the `Device` type and the `requestAsDevice` helper (used inside `agreementOf`).
- **`scripts/e2e/device-session.ts`** – Transitive neighbor; not directly imported here but likely supplies session utilities consumed by the harness or security-steps.

## Notes

- `beforeEach` calls `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')`, implying a DB-restore step that resets test data between cases.
- The analytics-consent checkbox requires `{ force: true }` to check/uncheck (likely hidden behind a CSS transition or overlay).
- Timestamp assertions use a ±60 s tolerance around `Date.now()` to avoid clock-skew flakiness.
- The provider test is explicitly **demo-only** (`cy.skipUnlessDemo()`); the `fake` OAuth button is a stub, not a real IdP.
- The `requires-module: account` annotation at the top signals this spec is skipped when the `account` module is not built.
