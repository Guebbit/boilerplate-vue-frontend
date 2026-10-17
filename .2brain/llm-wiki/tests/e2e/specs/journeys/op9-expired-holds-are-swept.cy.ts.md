---
source: tests/e2e/specs/journeys/op9-expired-holds-are-swept.cy.ts
sha256: 5a9f8f24ed917e087e6345169991f8da985dcbfbff1d5cf0e2acb80536a5e959
generated_at: 2026-10-17T02:22:05.723470+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op9-expired-holds-are-swept.cy.ts

## Purpose

End-to-end (Cypress) test for the OP9 journey: a customer checks out by card, never pays, the 30-minute hold expires, and an admin triggers the sweep. Asserts the order is cancelled, inventory is restored, the ledger records an `expire` reason, and the customer receives a notification email with the pay form removed.

## Key elements

- **`PAST_CARD_HOLD_MS`** — `31 * 60_000`; a duration just past the 30-minute card hold TTL (`NODE_RESERVATION_TTL_MINUTES`), used with `cy.travel()` to simulate time passing.
- **`OrderLike` / `ProductLike`** — minimal structural types (`status` / `available`) for the API responses this test reads.
- **`describe('OP9 · Expired holds are swept')`** — single-suite guard; `beforeEach` skips unless demo mode, restores fixtures, and re-navigates.
- **`it('the admin sweeps an unpaid card order…')`** — the only test. Creates an isolated product (5 on hand), walks the customer through cart → checkout → unpaid card order, advances the clock, clicks the admin sweep button, then verifies: order status = `cancelled`, product `available` restored, inventory ledger shows an `expire` movement, customer email mentions "payment not completed", and the pay form is gone from the order page.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `addOpenProductToCart` (adds the page product to cart) and `idFromLocation` (extracts the new order ID from the URL after checkout).
- **`scripts/e2e/mail-message.ts`** — provides `mailMentions`, used to assert the customer's notification email contains "payment not completed".

## Notes

- **Demo-only test:** time is advanced via `cy.travel()` (backend clock shift); no background job runs. The admin's manual button click is the sole sweep trigger.
- **Isolated product:** the test creates its own product (`E2E OP9 <timestamp>`) rather than relying on seeded stock, because the sweep releases *all* expired holds and would also alter a seeded product's shelf.
- **Race guard:** `cy.wait('@sweep')` before reading the order ensures the response has landed, preventing a false read on a loaded machine mid-sweep.
- Requires all six backend modules: `account, cart, inventory, orders, payments, products`.
