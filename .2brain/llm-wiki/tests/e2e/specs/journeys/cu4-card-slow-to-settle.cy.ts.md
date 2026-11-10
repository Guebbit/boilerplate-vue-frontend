---
source: tests/e2e/specs/journeys/cu4-card-slow-to-settle.cy.ts
sha256: 0ebebafc4ab239063ff85df66d5b455c6527d5a222d90b31cd5f7593d20789cf
signature: e1f14352933b12b5625ef6214435c98a6a14ea39ca33bfede718c03fe7531063
generated_at: 2026-11-10T07:01:00.324650+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu4-card-slow-to-settle.cy.ts

## Purpose

E2E journey test for the "slow-settle" card payment case (CU4). It verifies two outcomes when a card is submitted but the provider has not yet confirmed: (1) the order stays *pending* with a single "Finish" (sync) button, and clicking it completes the payment; (2) if the customer cancels while the payment is still processing, the system refunds the payment and the order remains canceled.

## Key elements

- **`payWithSlowCard()`** – Shared helper that logs in as `user`, adds `product.rich` to the cart, selects *pickup* shipping, checks out, and pays with the "Method that settles later" option. Returns the order id extracted from the URL.
- **`OrderLike`** – Minimal order shape the test reads (only `status`).
- **`PaymentLike`** – Minimal payment shape the test reads (`displayStatus`, `status`, `amount`, `amountRefunded`, `actions.pay`, `actions.sync`).
- **Test 1 – "waits honestly … paid once Finish reads its answer"** – Asserts the processing UI (Finish button present, card form absent, no invoice), confirms the order is `pending` and the server offers `sync: true` / `pay: false`, then clicks Finish and verifies the order flips to `paid` and the payment to `succeeded`.
- **Test 2 – "refunds the payment the moment the customer cancels"** – Cancels the order while processing, then uses `eventually` to poll until the payment reaches `displayStatus: 'refunded'` with full `amountRefunded`, and confirms the order stays `canceled` across a reload.

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports four helpers used throughout the test:
  - `addToCartFromStorefront` – seeds a cart item by product key.
  - `eventually` – polling helper that retries a getter until a predicate is satisfied (used for the async refund).
  - `idFromLocation` – extracts the order id from the browser URL after checkout.
  - `paymentOfOrder` – fetches the payment record for a given order id via the API layer.

## Notes

- Shipping is set to *pickup* specifically to skip the address step and keep the helper short.
- "Finish" is the UI name for the server action `sync`; the test asserts `actions.sync === true` and `actions.pay === false` to confirm the server is not offering a second charge.
- The refund in Test 2 is **asynchronous** (set by the cancel endpoint), so the test uses `eventually` to poll rather than asserting immediately after the cancel click.
- `cy.restore()` in `beforeEach` resets seeded data; the test relies on the `requires-module` header (`account, cart, delivery, inventory, orders, payments, products`) to know which fixtures must be loaded.
