---
source: tests/e2e/specs/journeys/cu16-a-whole-purchase-in-italian.cy.ts
sha256: 28366d16fde5fdb71a027e21db50c68ddd09b7a5da6fad0cfbd3c978d5a92a9b
signature: 14e0677182d8157da697408495f7a5906bfeeea51b2fad3ed771b280d52819a0
generated_at: 2026-11-10T06:55:29.670403+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu16-a-whole-purchase-in-italian.cy.ts

## Purpose

End-to-end Cypress spec that walks a full purchase in Italian—language switch, browse, cart, checkout, card payment, VAT summary, and Italian-language e-mails—verifying that every customer-facing string, money format, and outbound mail respects the locale the user selected. It guards against any copy, amount spelling, or link URL slipping back to English mid-flow.

## Key elements

- **`UNITS` (10)** – Quantity per line; chosen so two lines clear the 1 000 threshold that triggers Italian thousands-separator grouping.
- **`unspaced(text)`** – Strips all whitespace so money strings like `1.020,00 €` compare uniformly regardless of the formatter's spacing before `€`.
- **`basketCents`** – Module-scoped accumulator set inside the test; holds the expected cart total in cents for later assertions.
- **`describe('CU16 …') > it(…)`** – Single test with six `cy.step()` blocks:
  1. Switch app to Italian (language switcher → `<html lang="it">`, path under `/it`).
  2. Browse to a product, add it, add a second product via API, verify Italian cart copy (`Riepilogo`, `gratis oltre soglia`), assert total matches `/^\d+(\.\d{3})*,\d{2}€$/` **and** equals `basketCents` via `shouldShowCents`.
  3. Pay with a test card; assert `Riuscito` / `Pagato` statuses.
  4. Assert VAT summary labels (`Riepilogo IVA`, `Imponibile`) and that net + tax rows sum to the charged item total (via `sumCents`).
  5. Verify two e-mails (`Ordine ricevuto`, `Pagamento ricevuto`) are in Italian, format money as `\d,\d{2}\s*€`, and link to `/it/orders/`.
  6. After logout, send a password-reset e-mail and confirm it is in Italian and links to `/it/`.

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports `addOpenProductToCart`, `openProductCard`, `shouldShowCents`, `sumCents`; provides the cart-manipulation and cents-comparison primitives.
- **`tests/support/e2e/commands.ts`** – Imports `byTemplate`, `inLocale` for e-mail filtering by template name and language.
- **`tests/support/e2e/security-steps.ts`** – Imports `requestReset` to trigger a password-reset e-mail while signed out.
- **`scripts/e2e/mail-message.ts`** – Imports `mailMentions` to assert that a received e-mail body links to a given path (such as `/it/orders/`).

## Notes

- **ICU-dependent number format** – The spec accepts *both* `1.020,00` (grouped) and `1020,00` (un-grouped) via the regex `^\d+(\.\d{3})*,\d{2}€$` because the dot-grouping depends on the browser's ICU data version.
- **Dual money assertion** – Every monetary check is made twice: once for *format* (regex) and once for *value* (`shouldShowCents` / `sumCents` in cents), so a correct-looking but wrong amount still fails.
- **Mailbox requirement** – `cy.skipUnlessMailbox()` gates the whole test; it needs either the demo outbox or Mailpit running.
- **Second cart line via API** – The spec deliberately adds the second product with `cy.apiAs` (bypassing the UI quantity cap of 10) to keep the test focused on locale, not on max-quantity UI.
- **`requires-module` pragma** – The comment at the top lists the feature modules (`account`, `cart`, `delivery`, `inventory`, `orders`, `payments`, `products`) that must be available before this spec runs.
