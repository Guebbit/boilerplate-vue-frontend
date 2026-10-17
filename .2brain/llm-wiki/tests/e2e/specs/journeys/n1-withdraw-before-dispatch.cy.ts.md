---
source: tests/e2e/specs/journeys/n1-withdraw-before-dispatch.cy.ts
sha256: 8cc34fdff9f9de14168d57993d0ad8f13d14bbf807f1ff607a4db1cae997e891
generated_at: 2026-10-17T02:18:08.532150+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/n1-withdraw-before-dispatch.cy.ts

## Purpose

E2E smoke test for the EU right-of-withdrawal flow (Art. 11a) when the order has **not yet been dispatched**. Verifies the full customer journey: two-step confirmation dialog, order cancellation, full refund (goods + delivery), stock release, a closed return record with zero lines, and an acknowledgement email — all from the shopper's perspective with admin reads where needed.

## Key elements

- **`PaymentLike`** (local interface) — the subset of the `/payments/order/:id` response the test asserts on (`displayStatus`, `status`, `amount`, `amountRefunded`).
- **`describe('N1 · Withdraw before dispatch', { tags: '@smoke' })`** — single smoke-tagged suite; `beforeEach` performs a hard reset via `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')`.
- **Single `it` block** — walks the journey in five `cy.step` phases:
  1. Shopper buys `product.barebones` with standard shipping, pays by card.
  2. First click on the withdraw button triggers a confirm dialog; order remains `paid`.
  3. Second click cancels the order; refund (full amount incl. delivery) lands async via `eventually`.
  4. Return record is `closed` with reason `withdrawal` and **zero lines** (no goods to send back).
  5. Stock count (read as admin) returns to the pre-purchase value; acknowledgement email mentions the order number and "withdraw".

## Relationships

- **`tests/support/e2e/steps.ts`** — supplies every reusable step helper: `addOpenProductToCart`, `cents`, `centsOf`, `eventually`, `idFromLocation`, `orderNumberShown`, `searchAndOpenProduct`.
- **`scripts/e2e/cents.ts`** — source of the `cents` / `centsOf` utilities used to normalise monetary comparisons (avoids float pitfalls).
- **`scripts/e2e/mail-message.ts`** — provides `mailMentions`, used to assert the acknowledgement email contains the order number and the word "withdraw".

## Notes

- The file header declares `requires-module` for **account, cart, delivery, inventory, orders, payments, products, returns** — the test will fail at setup if any of those feature flags are off.
- Stock is read as **admin** (`cy.apiAs('admin', …)`) because the shopper UI only exposes the "In stock" flag, not the numeric count.
- The refund assertion is wrapped in `eventually` because the payments module answers the cancel asynchronously; a plain `should` would flake.
- Before dispatch the return is born **closed** with an empty `lines` array (no goods to ship back). After dispatch (see N2) the same return would be *approved* instead.
- `cy.subjectId('product.barebones')` resolves the seeded product's DB id at runtime — do not hard-code a UUID.
