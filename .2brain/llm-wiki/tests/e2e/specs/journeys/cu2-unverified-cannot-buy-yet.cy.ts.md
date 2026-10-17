---
source: tests/e2e/specs/journeys/cu2-unverified-cannot-buy-yet.cy.ts
sha256: 253d594bb2abbb17f65f3ed09d997d66f63b6d12632a2cad1386eee9a61e8453
generated_at: 2026-10-17T02:11:06.527880+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu2-unverified-cannot-buy-yet.cy.ts

## Purpose

End-to-end test for the CU2 journey: a visitor signs up, adds a product to the cart, and hits checkout while still unverified. The test asserts the refusal message is specific (the API's own sentence, not a generic error), that the resend link respects a server cooldown, and—critically—that after following the emailed verification link the *same* cart (verified by item count, not re-added) checks out successfully. Nothing in this test pays real money.

## Key elements

- **`describe('CU2 · An unverified account cannot buy yet')`** — Single test suite; one `it` block runs the full sign-up → shop → refuse → resend → verify → re-checkout flow.
- **`beforeEach`** — Visits `/en`, calls `cy.restore()`, visits again to reset app state.
- **`cy.skipUnlessMailbox()`** — Gate: the test aborts unless a mailbox (demo outbox or Mailpit) is available.
- **`EMAIL` / `PASSWORD`** — Hardcoded credentials for this test's disposable account.
- **Step assertions** — `cy.step(...)` calls mark narrative beats (sign-up, refusal, resend cooldown, verification, successful checkout).
- **Cart-survival checks** — `[data-test=cart-item]` length is asserted as `1` before the refusal, immediately after the refusal, and again before the successful checkout, proving nothing was re-added.
- **Refusal assertion** — `[data-test=cart-checkout-error]` must `contain.text` the phrase *"confirm your email address"*; the page must stay on `/cart/`.

## Relationships

- **`tests/support/e2e/steps.ts`** — Supplies the high-level journey steps used here: `signUp` (creates the account), `addToCartFromStorefront` (adds `product.barebones`), and `fillAddressDialog` (enters the billing address required for pickup).
- **`tests/support/e2e/commands.ts`** — Supplies `mailedLinkUrl`, which extracts the verification URL from the captured email so the test can `cy.visit` it.

## Notes

- **`click({ force: true })` on checkout** — The "address saved" toast overlaps the checkout button; `force` bypasses the actionability check. The `.should('not.be.disabled')` assertion still runs before the click, so the guard is intact.
- **Pickup vs. billing** — Pickup shipping is chosen to skip the *shipping* address step, but the account has no saved address at all, so the *billing* address dialog must still be filled. This is a deliberate part of the test: after that, the *only* remaining blocker is the unverified email.
- **Resend cooldown** — After clicking `verify-resend`, the button is immediately expected to be `disabled`, asserting the server enforces a cooldown before another mail can be sent.
- **`requires-module` header** — The file declares dependencies on the account, cart, delivery, inventory, orders, and products modules; the test cannot run in isolation from those.
- **No real payment** — The test stops at order confirmation (`#order-target` visible); it never reaches a payment step.
