---
source: tests/e2e/specs/journeys/ps5-my-preorder-is-late.cy.ts
sha256: 04faff35929f0cbfc40db0cde2d67624dd767a5c6b1e15e5c0d685a06dd35197
signature: 728e02f4a435e0cdb990b61e5deaf1998f7af0da95686a94d2d8f4474a9d44a9
generated_at: 2026-11-10T07:21:25.877856+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ps5-my-preorder-is-late.cy.ts

## Purpose

End-to-end journey test (PS5) that verifies the buyer-side experience when a preorder's release date is delayed: the customer receives a delay notice and a lateness notice (mail + in-app bell) but is never prompted to consent or answer; one buyer may cancel from the order page while the other's order remains open after a further month of inactivity.

## Key elements

- **`buyAndPay(productId)`** — Helper chain: clears cart, adds one unit, selects pickup shipping, checks out, pays with "Card that pays", returns the new order ID.
- **`mailedToCustomer(subject)`** — Resolves the test user's email address and asserts an incoming mail whose subject matches the given fragment (via `mailMentions`).
- **`describe('PS5 · My preorder is late')`** — Single test case exercising four phases: initial "awaiting stock" state, date shift (+14 days), past-deadline sweep, and post-sweep silence (31 days).
- **`DAY_MS`** — Milliseconds-per-day constant used with `cy.travel()` for clock jumps.
- **`OrderLike`** — Minimal interface (`status: string`) for API assertions on order status.

## Relationships

- **`scripts/e2e/mail-message.ts`** — Provides `mailMentions`, used inside `mailedToCustomer` to match a mail's subject-line fragment rather than exact content.
- **`tests/support/e2e/steps.ts`** — Provides `preorderOnSale` (creates a live preorder with a relative release date), `releaseDateIn` (computes a future date string for the PATCH), `idFromLocation` (extracts the order ID from the post-checkout URL), and `eventually` (polls an API call until a predicate is met).

## Notes

- Guarded by `cy.skipUnlessDemo()`; the clock jumps (`cy.travel`) and sweep triggers (`cy.runJob('sweep-preorders')`) mean the test never waits in real time.
- The header comment `requires-module:` lists the application modules that must be active for the test to pass (account, cart, delivery, inventory, notifications, orders, payments, products).
- Two orders are purchased deliberately: the first is canceled by the buyer, the second is left untouched to prove the sweep does not auto-cancel on silence.
- The test asserts the **absence** of interactive elements (`confirm-wait`, `fulfillment-order-consent`, `fulfillment-order-answer-by`) at every stage, enforcing the "nobody is asked anything" contract.
- The refund / credit-note / post-cancel mail flows are explicitly out of scope here (delegated to the cancel's own tests, per the module doc).
