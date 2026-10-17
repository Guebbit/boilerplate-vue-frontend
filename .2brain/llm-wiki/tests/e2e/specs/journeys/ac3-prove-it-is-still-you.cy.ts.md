---
source: tests/e2e/specs/journeys/ac3-prove-it-is-still-you.cy.ts
sha256: a89aee930808811c39e8a51100f845a8876f3823721f045bbdf6913833cafaf1
generated_at: 2026-10-17T02:06:15.033394+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac3-prove-it-is-still-you.cy.ts

## Purpose

Journey test for AC3 (re-authentication). Verifies that when a customer's fresh-login window has lapsed, sensitive actions (checkout, data export) surface a re-auth dialog instead of failing; a wrong password is rejected with a user-friendly error; cancel abandons the pending action; and the correct password resumes the exact action that triggered the dialog.

## Key elements

- **`PAST_CRITICAL_MS` (400 000 ms)** – Time offset placed past the 300 s critical window (`NODE_REAUTH_TIME_CRITICAL`) but inside the 600 s access-token lifetime, so no token refresh is needed.
- **`PAST_SENSITIVE_MS` (1 000 000 ms)** – Time offset past the 900 s sensitive window (`NODE_REAUTH_TIME_SENSITIVE`); the access token (600 s) has also expired, so a refresh happens before the re-auth dialog appears.
- **`answerDialog(password)`** – Types the given string into `[data-test=reauth-dialog-password] input` and clicks the submit button.
- **`answerWithCustomerPassword()`** – Resolves the customer's real password via `cy.accountOf('user')` and feeds it to `answerDialog`.
- **`describe('AC3 · Prove it's still you')`** – Single `it` block (tagged `@smoke`) that walks through: cart → checkout 401 → wrong-password rejection → cancel → retry with correct password → order created (201); then profile export 401 → cancel → retry → accepted (202).

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `addToCartFromStorefront`, used to place a product in the cart before the time-travel step.

## Notes

- **Demo-only**: the test calls `cy.skipUnlessDemo()` and `cy.travel()`, both of which are unavailable (or no-op) against non-demo backends.
- **State reset**: `beforeEach` visits `/en`, calls `cy.restore()` (wipes DB), then visits `/en` again to ensure a clean slate for every run.
- **Error-message assertions**: after cancel, the test asserts the inline error element is non-empty but does **not** contain raw API phrasing like `"Unauthorized"` or `"Unprocessable Entity"` — the UI must translate the 401 into customer-facing copy.
- **Module requirements** (header comment): `account, cart, delivery, inventory, orders, payments, products` must be loaded in the demo environment for this journey to pass.
- **Two re-auth tiers are exercised in one test**: critical (checkout) and sensitive (export), each with its own time window and the same dialog component.
