---
source: tests/e2e/specs/journeys/cu3-bank-transfer.cy.ts
sha256: d4bd5c4303f11ff68dd8c5f809bd16299b8ac137972ee00acf9489df1a90e046
signature: 4d8e40c4ee0de88d3e08a120256ba86bd628938cf7f9cb1eec4749e1daa25439
generated_at: 2026-11-10T06:59:32.062959+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu3-bank-transfer.cy.ts

## Purpose

Cypress e2e smoke test for the CU3 "bank transfer" checkout journey. It verifies the full two-sided flow: the customer selects bank-transfer payment, reads the transfer instructions (IBAN, reference, deadline), copies them; the admin locates the order by that reference and records the offline payment; the customer then sees the order as paid. It exists to prove the shared bank reference is the single handle connecting all three surfaces (customer screen, admin search, confirmation mail).

## Key elements

- **`describe('CU3 · Bank transfer, both sides', { tags: '@smoke' })`** — single test case covering the entire journey in one `it` block.
- **`HOLD_HOURS = 168`** — mirrors the `NODE_BANK_TRANSFER_HOLD_HOURS` env value; used to assert the `payBy` deadline.
- **`BANK_REFERENCE = 'E2E-CU3-0001'`** — the reference the admin types when recording the offline payment.
- **`TransferAction`** — interface describing the slice of the payment's `nextAction` the test reads (`beneficiary`, optional `bic`, `payBy`).
- **`shownWithoutSpaces(selector)`** — small helper that reads a `data-test` element's text and strips all whitespace, used to compare grouped IBANs/references against clipboard contents.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` (adds a product to the cart from the storefront) and `idFromLocation` (extracts the order id from the URL after checkout). Both are called directly in the test body.
- **`scripts/e2e/mail-message.ts`** — imports `mailMentions`, a predicate that checks whether a received email body contains a given string. Used to verify the instructions mail carries the correct reference and IBAN, and to confirm the "Payment received" mail arrives.

## Notes

- The `beforeEach` performs a `cy.visit → cy.restore → cy.visit` sequence to reset server-side state before each run.
- Clipboard assertions call `cy.grantClipboard()` first (Cypress permission) and then read via `window.navigator.clipboard.readText()`, comparing whitespace-stripped values.
- The admin "awaiting-transfer" filter check relies on a *second* seeded order (`order.awaitingTransfer`) still being present to prove the filter actually loaded; the tested order should be absent.
- The `bic` field is conditional: the test asserts the element is absent when `bic` is undefined on the API payload, rather than asserting an empty string.
- Tagged `@smoke`, so it runs in the fast e2e pass; the `requires-module` comment lists all backend modules that must be enabled for the test to pass.
