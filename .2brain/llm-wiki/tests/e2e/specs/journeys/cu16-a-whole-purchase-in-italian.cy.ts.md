---
source: tests/e2e/specs/journeys/cu16-a-whole-purchase-in-italian.cy.ts
sha256: 5ebd71fe36e4672f8961b5bec5ff3da4609c720472553e866bf1bfc4e021c038
generated_at: 2026-10-17T02:10:16.762832+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu16-a-whole-purchase-in-italian.cy.ts

## Purpose

End-to-end journey (CU16) that drives a full Italian-language purchase: the customer switches the UI to Italian, adds two products to the cart (total exceeding one thousand), checks out with standard shipping, pays by card, verifies the VAT summary, and confirms the transactional emails arrive in Italian with Italian-locale links. It exists to guard against any fragment of the flow remaining in English — copy, currency formatting, VAT labels, and mail subjects all follow the selected language.

## Key elements

- **`UNITS`** (const `10`) — units per product line; two lines together clear one thousand to exercise the thousands-separator path.
- **`unspaced(text)`** — strips all whitespace so the money regex isn't broken by a formatter-inserted space before `€`.
- **`basketCents`** (module-level `let`) — expected cart total in cents, computed once the two product prices are known.
- **`describe / beforeEach`** — resets state by visiting `/en`, calling `cy.restore()`, then visiting `/en` again before each test.
- **Single `it` block** — the entire Italian purchase: language switch → browse → cart → checkout → payment → VAT → mail assertions. Skipped unless a mailbox is available (`cy.skipUnlessMailbox()`).

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the imported helpers `openProductCard`, `addOpenProductToCart`, `shouldShowCents`, and `sumCents` used throughout the cart, total, and VAT verification steps.
- **`scripts/e2e/mail-message.ts`** — provides `mailMentions`, used to assert that the payment-receipt email body links to the `/it/orders/…` path rather than an English one.
- **`scripts/e2e/cents.ts`** — underlying cents-arithmetic utility that `sumCents` and `shouldShowCents` (from `steps.ts`) rely on for the "same amount regardless of spelling" comparisons.

## Notes

- **ICU-dependent formatting:** the spec deliberately accepts both `1.020,00€` and `1020,00€` (regex `\d+(\.\d{3})*,\d{2}€`) because the browser's ICU version determines whether a four-digit amount gets a thousands dot.
- **Two insertion paths:** the first product is added through the UI (`addOpenProductToCart`); the second is added via `cy.apiAs` POST to `/cart` because the per-line ceiling (10 units) would keep a single line under one thousand.
- **Mail discovery is language-sensitive:** emails are located *by their Italian subject* (`Ordine ricevuto`, `Pagamento ricevuto`), so a regression that sends English mail will cause the lookup to fail rather than just a text assertion.
- **`requires-module` header** lists seven backend modules (account, cart, delivery, inventory, orders, payments, products) — the test needs all of them provisioned.
- **`basketCents` is mutable module state** set inside the test callback; safe here because the file contains exactly one test, but it would be fragile if a second `it` block were added.
