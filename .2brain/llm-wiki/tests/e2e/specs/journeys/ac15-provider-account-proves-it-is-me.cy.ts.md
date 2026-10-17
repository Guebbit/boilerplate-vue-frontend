---
source: tests/e2e/specs/journeys/ac15-provider-account-proves-it-is-me.cy.ts
sha256: ac1d9c74e66a190cc1680985c36eee28986d71e8f2072b99ae15f1a7430a4fbd
generated_at: 2026-10-17T02:05:01.940235+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac15-provider-account-proves-it-is-me.cy.ts

## Purpose

E2E journey test for AC15: verifies that a provider (fake OAuth) account with no password can complete a re-authentication challenge via a mailed code during checkout. It exercises the full flow—code request, cooldown lock, wrong-code rejection, and correct-code carry-through—confirming the user resumes the exact checkout that triggered the 401.

## Key elements

- **`PAST_CRITICAL_MS`** (400 000 ms) — time offset used with `cy.travel` to push past the 300 s critical window while staying inside the 600 s access-token lifetime.
- **`PROVIDER_EMAIL`** (`oauth.demo@example.com`) — the pre-verified address the fake provider returns; used to look up the mailed 2FA code.
- **`describe › beforeEach`** — resets state (`cy.restore`), reloads `/en`.
- **`it › 'checkout asks for a mailed code…'`** — the single test case, structured as sequential `cy.step` blocks covering: sign-in via fake OAuth, cart + address setup, time travel to expire the fresh-login window, 401 → re-auth dialog, no password field, send-code + cooldown, wrong-code rejection, correct-code → 201 checkout.
- **`cy.skipUnlessDemo()`** — guards the entire test so it runs only in demo mode (where the fake OAuth provider and `cy.travel` exist).

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` (adds a known product to the cart) and `fillAddressDialog` (populates the billing-address form with Ada Lovelace / Modena details). Both are called mid-flow to set up the checkout preconditions.

## Notes

- **Demo-only.** The fake OAuth provider (`[data-test=oauth-fake]`) and the `cy.travel` time-advance helper exist solely in the demo backend; the test is skipped outside that environment.
- **`force: true` click** on the checkout button is intentional: the "address saved" toast can overlap the button's hit area.
- **Cooldown assertion** checks that the *send* button becomes disabled after a 200 response, but does not wait for the server-side cooldown to expire—it relies on the demo backend allowing the next code attempt immediately.
- The `requires-module` comment at the top lists the backend modules the demo environment must have loaded (`account`, `cart`, `delivery`, `inventory`, `orders`, `payments`, `products`).
- The test asserts the 401 → 201 *sequence* on the same `POST **/cart/checkout` alias, confirming the correct code carries the original checkout forward rather than starting a new one.
