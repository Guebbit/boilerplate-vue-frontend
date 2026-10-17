---
source: tests/e2e/specs/journeys/cu1-first-purchase.cy.ts
sha256: 4cd6697ace87bc79f1ec879a8e5e807af31c74c6a6d50840629126f6045bb474
generated_at: 2026-10-17T02:09:05.928501+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu1-first-purchase.cy.ts

## Purpose

Smoke-level end-to-end journey (tag `@smoke`) for a brand-new visitor: sign up, verify via mailed link, browse a category, add two products, add an address in the checkout dialog, pay by card, and verify that every monetary amount is identical across cart, order page, tax summary, invoice PDF, and confirmation email. Exists to catch regressions in the full first-purchase flow and to assert amount consistency in **cents** at every hand-off.

## Key elements

- **`describe('CU1 · First purchase, from nothing')`** — single-test suite; `beforeEach` visits `/en`, calls `cy.restore()`, revisits to reset state.
- **`it('a new visitor signs up, verifies, buys two products by card and reads the same amounts everywhere')`** — the only test. Walks through seven `cy.step` blocks: sign-up & email verification → browse & add two products → checkout with address dialog → cart total check → card payment → order-page cross-checks (lines, addresses, shipping, VAT) → invoice download (PDF 200) → confirmation email.
- **`EMAIL` / `PASSWORD`** — fixed credentials for the test account (`first.purchase@example.com`).
- **`centsOf(selector)` / `sumCents(strings)`** — imported from `steps`; read or sum monetary values as integer cents for exact assertions.
- **`mailMentions(mail, fragment)`** — imported from `scripts/e2e/mail-message`; asserts a mailbox message contains a given substring (used to find the order-link email).
- **`mailedLinkUrl(email)`** — imported from `commands`; extracts the clickable verification URL from a received email.
- **`fillAddressDialog(…)`, `signUp`, `signInWith`, `openProductCard`, `addOpenProductToCart`, `searchAndOpenProduct`** — high-level step helpers imported from `steps`.

## Relationships

- **`tests/support/e2e/steps.ts`** — primary source of composable UI steps (`signUp`, `signInWith`, `openProductCard`, `addOpenProductToCart`, `searchAndOpenProduct`, `fillAddressDialog`) and the cents arithmetic helpers (`centsOf`, `sumCents`).
- **`tests/support/e2e/commands.ts`** — provides `mailedLinkUrl`, used to open the email-verification link.
- **`scripts/e2e/mail-message.ts`** — provides `mailMentions`, used to assert the confirmation email references the correct order path.
- **`scripts/e2e/cents.ts`** — upstream implementation of the cents-parsing/summing logic that `steps.ts` re-exports as `centsOf` / `sumCents`; the test never imports it directly.

## Notes

- **Mailbox required.** The test calls `cy.skipUnlessMailbox()`; it will be skipped (not failed) if no outbox or Mailpit instance is running.
- **Two cheap products on purpose.** Standard shipping is free above a 100-unit threshold; using `product.rich` + `product.barebones` guarantees a non-zero shipping line so the `items + shipping = total` assertion is meaningful.
- **Cypress queuing gotcha.** Amount values are read inside `.then()` callbacks (not passed as plain arguments) because Cypress queues the entire `it` body before any async commands resolve; a bare `const` would still hold the initial `0`.
- **Billing = shipping by default.** The test leaves billing on "same as shipping," so the order page shows `Via Emilia 1` in both the shipping and billing address fields.
- **VAT rows include shipping.** Each `order-tax-row` net + tax cell already folds in its share of shipping; summing all rows must equal `cart.items + cart.shipping`.
- **Email links to the order, not the invoice.** The confirmation email contains a URL to `/orders/:id`; the PDF invoice is a separate `GET` fetched from the order page and validated for `content-type: application/pdf`.
- **Products are referenced by key** (`product.rich`, `product.barebones`), not by display name, and must exist in the fixture data for the test to pass.
