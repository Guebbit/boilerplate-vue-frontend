---
source: tests/e2e/specs/journeys/cu2-unverified-cannot-buy-yet.cy.ts
sha256: 253d594bb2abbb17f65f3ed09d997d66f63b6d12632a2cad1386eee9a61e8453
signature: 253d594bb2abbb17f65f3ed09d997d66f63b6d12632a2cad1386eee9a61e8453
generated_at: 2026-11-10T06:56:42.274317+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu2-unverified-cannot-buy-yet.cy.ts

## Purpose

End-to-end journey test (CU2) that verifies an unverified account's purchase is refused with a specific, API-sourced error message rather than a generic failure, and that the same cart — unchanged in item count — completes checkout after the user follows the mailed verification link. It also asserts the resend banner honours a server-side cooldown.

## Key elements

- **`EMAIL` / `PASSWORD`** – Fixed test credentials (`slow.reader.cu2@example.com`) used for sign-up; the password is chosen to pass the strength rule.
- **`describe('CU2 · …')`** – Single test suite with one `it` block covering the full sign-up → shop → refused-checkout → resend → verify → successful-checkout flow.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()`, then revisits `/en` to ensure a clean page state.
- **`cy.skipUnlessMailbox()`** – Skips the test entirely when no mailbox backend is available.
- **`cy.emailTo(EMAIL)` / `mailedLinkUrl(email)`** – Retrieves the verification email and builds the link URL to visit.
- **`fillAddressDialog(…)`** – Populates the billing-address form with hardcoded Modena, Italy data.

## Relationships

- **`tests/support/e2e/steps.ts`** – Supplies the imported step helpers `signUp`, `addToCartFromStorefront`, and `fillAddressDialog`, which wrap multi-step UI interactions.
- **`tests/support/e2e/commands.ts`** – Supplies the imported `mailedLinkUrl` helper used to construct the verification link URL from the email body.

## Notes

- The test is **gated on a mailbox** (Mailpit in CI, or the demo outbox locally); it will silently skip without one.
- The checkout button is clicked with `{ force: true }` because an "address saved" toast overlaps the button; the `not.be.disabled` assertion still guards against a disabled state.
- The billing address is added via the dialog because the new account starts with an **empty address book**; pickup shipping is selected to avoid a shipping-address requirement.
- The `requires-module` header comment lists the backend modules this test exercises: account, cart, delivery, inventory, orders, products.
- The test explicitly checks `cart-item` length (=== 1) both *before* and *after* the refused checkout and *after* verification, to prove no duplicate items are created.
