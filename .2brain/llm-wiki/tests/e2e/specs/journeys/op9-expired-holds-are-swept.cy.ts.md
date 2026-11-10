---
source: tests/e2e/specs/journeys/op9-expired-holds-are-swept.cy.ts
sha256: e3e7b3e001222bdef20b2f08884af70dcd6d2699fe324b6115a3d33aa15edbd2
signature: 4d7e7dc5dbec6c7545cf9c5d16dce2259751a5de8abb10bc676274d097c60638
generated_at: 2026-11-10T07:20:10.487227+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op9-expired-holds-are-swept.cy.ts

## Purpose

Cypress E2E journey test verifying that when a card-payment hold expires (past the 30-minute `NODE_RESERVATION_TTL_MINUTES` default), an admin-triggered sweep cancels the order, returns the reserved units to the product shelf, records the release in the inventory ledger as `expire`, emails the customer a "payment not completed" notice, and removes the pay form from the order. Runs only in demo mode.

## Key elements

- **`PAST_CARD_HOLD_MS`** — constant (31 min in ms) used with `cy.travel()` to advance the backend clock past the hold window.
- **`describe('OP9 · Expired holds are swept')`** — single `it` block walking the full story: customer checks out by card without paying → hold expires → admin clicks the sweep button on the inventory page.
- **Own product creation** (`cy.createProduct`) — the test creates a fresh product (5 on hand) instead of reusing a seeded one, because the sweep releases *every* expired hold and a seeded product's shelf would be polluted by other unpaid orders.
- **Sweep trigger** — `cy.intercept('POST', '**/inventory/reservations/sweep')` + clicking `[data-test=sweep-submit]`; the test waits for the intercepted 200 response before reading order/product state to avoid a race.
- **Ledger assertion** — navigates to `/en/inventory`, filters movements by reason containing "expire", and asserts at least one row.
- **Email assertion** — uses `cy.emailTo` with a `mailMentions` predicate to confirm the customer received a "payment not completed" message.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addOpenProductToCart` (adds the product to the cart via UI) and `idFromLocation` (extracts the newly created order id from the URL after checkout).
- **`scripts/e2e/mail-message.ts`** — imports `mailMentions`, a predicate that checks whether a mail body contains a given phrase; used to assert the "payment not completed" email.

## Notes

- **Demo-only:** `cy.skipUnlessDemo()` in `beforeEach` means this test is skipped in non-demo environments.
- **No background job:** The sweep does not run automatically; the admin's manual button click is the sole trigger. Time is advanced via `cy.travel()` (backend clock manipulation), not real waiting.
- **Race guard:** The `cy.wait('@sweep')` before reading order/product state exists because on a loaded CI machine the sweep may still be in-flight when the next assertion fires.
- **Requires modules:** `account`, `cart`, `inventory`, `orders`, `payments`, `products` (per the file header comment).
