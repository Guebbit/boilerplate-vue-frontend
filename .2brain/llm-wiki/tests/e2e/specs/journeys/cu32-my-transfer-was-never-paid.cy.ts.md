---
source: tests/e2e/specs/journeys/cu32-my-transfer-was-never-paid.cy.ts
sha256: 00ff64df0e7c5e182dc1a02a4885148b5a67aca0747b540bff66d9695a3a1a37
signature: 4877b8e5c6518e17fc45eda24eae8c06b25bd9aaf3e074b8dc0e5a03d1379efe
generated_at: 2026-11-10T07:00:17.635078+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu32-my-transfer-was-never-paid.cy.ts

## Purpose

End-to-end journey test for **CU32 – My transfer was never paid**. It verifies the full lifecycle: customer checks out via bank transfer (reading the hold-duration notice), the stock hold expires with no payment (order is canceled, leaves the awaiting-transfer list, customer page offers no pay/cancel actions), and then the money arrives late (admin locates the canceled order by reference, records the transfer, and the payment appears under "money to hand back").

## Key elements

- **`HOLD_HOURS`** – Constant `168`; the demo stock-hold duration (mirrors `NODE_BANK_TRANSFER_HOLD_HOURS`).
- **`HOUR_MS`** – Constant `3_600_000`; used to compute the `cy.travel()` delta.
- **`OrderLike`** – Minimal interface (`{ status: string }`) for API-level assertions.
- **`describe('CU32 …')` / single `it(…)`** – One long scenario with step-by-step `cy.step()` blocks covering: checkout → admin awaiting-list check → clock-jump + sweep → customer page verification → awaiting-list removal → late reference lookup → recording the transfer → payments "attention" tab assertion.
- **`cy.skipUnlessDemo()`** – Gate: test runs only in demo environments.
- **`cy.travel()` / `cy.runJob('sweep-reservations')`** – Time and job triggers that simulate the hold expiring (no real waiting).
- **`cy.apiAs()`** – Direct API calls for order-status checks and for POSTing the late bank-transfer payment.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides `addToCartFromStorefront` (adds a product to the cart from the storefront) and `idFromLocation` (extracts the order ID from the post-checkout URL). Both are imported and used in the checkout step.

## Notes

- **Demo-only.** The test is skipped outside demo mode; it depends on `cy.travel()` and `cy.runJob()`, which are demo-specific commands.
- **Clock jump is `HOLD_HOURS * HOUR_MS + 10 min`** – the extra 10 minutes gives the sweep a small grace window so the reservation is unambiguously expired.
- **Reference normalization.** The transfer reference is read from the DOM and all whitespace is stripped (`replaceAll(/\s+/g, '')`) before being used in the late-lookup step, because the display may include spaces/dashes.
- **`cy.settleNetwork()`** is called before asserting the order is *gone* from the awaiting list, to avoid a race where the list hasn't refreshed yet.
- The late-payment POST uses a hardcoded reference string `'LATE-TRANSFER-1'`; it is not the same as the customer-facing reference captured earlier.
- The "money to hand back" assertion lives under the **attention** tab of `/en/sales/payments`, not the default view.
