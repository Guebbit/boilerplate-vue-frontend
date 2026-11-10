---
source: tests/e2e/specs/journeys/cu1-first-purchase.cy.ts
sha256: 0a890de6f5c8b9488065324e6f2b2edb564f2f2674121445bf91814b35b23c80
signature: 0a890de6f5c8b9488065324e6f2b2edb564f2f2674121445bf91814b35b23c80
generated_at: 2026-11-10T06:53:46.992544+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu1-first-purchase.cy.ts

## Purpose

End-to-end smoke test for the complete first-purchase journey (CU1): a brand-new visitor signs up, verifies via a mailed link, browses a category, adds two products to the cart, enters a shipping address at checkout, pays by card, and confirms that every monetary figure on the order page and invoice matches the cart totals. The test's core assertion is that the money stays identical from cart → order → tax breakdown → email.

## Key elements

- **`EMAIL` / `PASSWORD`** — fixed credentials for the disposable test account.
- **`beforeEach`** — visits the site, runs `cy.restore()` (fixture reset), visits again.
- **`describe('CU1 …', { tags: '@smoke' })`** — the suite; gated by `@smoke` tag so it can be selected in CI.
- **`it('a new visitor signs up…')`** — the single, multi-step test body, sequenced with `cy.step()` calls:
  1. Sign-up + email verification (via mailed link).
  2. Browse category, add two named products.
  3. Cart → checkout: select standard shipping, add address dialog.
  4. Verify cart arithmetic (items + shipping = total; shipping > 0).
  5. Pay with card; assert "Succeeded".
  6. Order page: line-item sum equals cart items, shipping frozen, VAT rows sum to total.
  7. Intercept invoice download; assert 200 + `application/pdf`.
  8. Assert the order email links back to this order's URL.

## Relationships

| Neighbor | Interaction |
|---|---|
| `tests/support/e2e/steps.ts` | Supplies all high-level step helpers: `signUp`, `signInWith`, `openProductCard`, `addOpenProductToCart`, `searchAndOpenProduct`, `fillAddressDialog`. |
| `tests/support/e2e/commands.ts` | Supplies `mailedLinkUrl` to extract the verification URL from a captured email. |
| `scripts/e2e/cents.ts` | Supplies `centsOf` (parse a formatted amount to integer cents) and `sumCents` (sum an array of cent values). All monetary assertions go through these. |
| `scripts/e2e/mail-message.ts` | Supplies `mailMentions` — a predicate that checks whether a mail body references a given string (used to find the order-confirmation email). |

## Notes

- **Mailbox required.** `cy.skipUnlessMailbox()` at the top of the test skips the whole case if no outbox/Mailpit is reachable. The header comment names both acceptable backends.
- **Cents, never strings.** Every amount comparison goes through `centsOf` / `sumCents`; comparing formatted text would break on locale or rounding.
- **Cypress queuing gotcha.** The test deliberately uses `.then((v) => …)` callbacks rather than capturing values in outer `let` variables, because Cypress queues the entire `it` body before any command executes. The inline comment above the order-shipping assertion calls this out explicitly.
- **Cheap products on purpose.** The two selected products (`product.rich`, `product.barebones`) are chosen so the subtotal stays below the free-shipping threshold; otherwise the "shipping > 0" and "items + shipping = total" assertions would be vacuous.
- **`requires-module` header comment** lists the backend modules that must be running: account, cart, delivery, inventory, orders, payments, products.
- **Billing address** is left on "same as shipping" (the default radio), so the order page is expected to show the single street address in both the shipping and billing blocks.
