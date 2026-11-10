---
source: tests/e2e/specs/journeys/ac15-provider-account-proves-it-is-me.cy.ts
sha256: ac1d9c74e66a190cc1680985c36eee28986d71e8f2072b99ae15f1a7430a4fbd
signature: ac1d9c74e66a190cc1680985c36eee28986d71e8f2072b99ae15f1a7430a4fbd
generated_at: 2026-11-10T06:45:37.348004+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac15-provider-account-proves-it-is-me.cy.ts

## Purpose

End-to-end journey test for AC15: verifies that a provider (OAuth) account—which has no password—can re-authenticate via a mailed code during checkout. The test walks the full happy-and-unhappy path: sign-in through the fake provider, fill a cart, let the critical window lapse, receive the re-auth dialog, reject a wrong code, accept the correct code, and confirm the original checkout proceeds to order confirmation.

## Key elements

- **`PAST_CRITICAL_MS`** (400 000) — Time to travel past the 300 s critical window but still inside the 600 s access-token lifetime; used with `cy.travel` to expire the "fresh-login" grace period.
- **`PROVIDER_EMAIL`** (`oauth.demo@example.com`) — The pre-verified address the fake provider returns; also the mailbox where the test reads the correct 6-digit code.
- **`describe('AC15 · A provider account proves it is still the owner')`** — Single test suite; `beforeEach` visits `/en`, restores demo state, and revisits.
- **Single `it` block** — One long sequential journey broken into six `cy.step` milestones (sign-in → cart → window lapse → dialog inspection → code send/wrong/right → checkout completes with 201).

## Relationships

- Imports **`addToCartFromStorefront`** and **`fillAddressDialog`** from `tests/support/e2e/steps.ts` to add a product and populate the billing-address form without duplicating UI interactions.

## Notes

- **Demo-only gate:** `cy.skipUnlessDemo()` at the top of the test means it is silently skipped outside the demo environment.
- **Fake OAuth provider:** The `[data-test=oauth-fake]` button and the entire `cy.travel` clock manipulation exist only in the demo backend; this test will not run against production.
- **`force: true` on the checkout click:** A "address saved" toast can overlay the checkout button; the force flag is a workaround for that overlap, not a sign of a disabled state.
- **Cooldown is server-driven:** After "send code," the button is disabled by the server's own cooldown—no client-side timer is tested here.
- **Error assertion detail:** The wrong-code rejection is checked to *not* mention "password," confirming the dialog's wording stays in code-language (relevant because the account has no password).
