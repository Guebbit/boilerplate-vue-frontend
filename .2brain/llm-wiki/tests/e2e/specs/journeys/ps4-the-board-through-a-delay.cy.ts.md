---
source: tests/e2e/specs/journeys/ps4-the-board-through-a-delay.cy.ts
sha256: fe409dcc70d5becd426bf18d06ca426cdd8bdffff6dd50684e4c918d249b20ca
signature: fe409dcc70d5becd426bf18d06ca426cdd8bdffff6dd50684e4c918d249b20ca
generated_at: 2026-11-10T07:21:14.294577+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ps4-the-board-through-a-delay.cy.ts

## Purpose

E2E journey test that verifies the full lifecycle of a delayed preorder: an admin moves a paid preorder's release date later via the preorder board, the board reflects the slip, the buyer receives a delay email, a post-deadline sweep sends a second notice, and—critically—no automatic cancellation occurs even a month later. It exists to guard the policy that delays are communicated but never auto-resolved; a human must decide.

## Key elements

- **`DAY_MS`** – Constant (86 400 000) used with `cy.travel()` for all clock jumps in the test.
- **`describe('PS4 · The preorder board through a delay')`** – Top-level suite; `beforeEach` gates on demo mode (`cy.skipUnlessDemo()`), restores a clean DB, and lands on `/en`.
- **`it('shows the slip, tells the buyer once the date passes, and cancels nothing on its own')`** – Single test covering four sequential phases:
  1. Admin moves the release date from 5 days out to 15 days out via the board's date-move control.
  2. Board shows a `preorder-slipped` badge; buyer receives an email matched by the `delivery.fulfillment-delayed` template.
  3. After a 16-day travel + `sweep-preorders` job, buyer receives a "Part of your order is late" email; row appears only under the **Late** filter, not **Due soon**.
  4. After a further 31-day travel + sweep, no `preorder-cancel-reason` is set and the order status is not `canceled`.

## Relationships

- **`scripts/e2e/mail-filters.ts`** – Exports `byTemplate`, which is called with the string `'delivery.fulfillment-delayed'` to build the email matcher for the first delay notification.
- **`scripts/e2e/mail-message.ts`** – Exports `mailMentions`, used to assert the sweep's second notification contains the text "Part of your order is late".
- **`tests/support/e2e/steps.ts`** – Exports the high-level journey steps `preorderOnSale`, `paidPreorderBy`, and `releaseDateIn` used to set up the fixture and compute the target release date.

## Notes

- **Demo-only**: the entire test is skipped outside demo mode; `cy.travel()` and `cy.runJob()` are demo-mode primitives for time manipulation and background-job triggering.
- **No real waiting**: all time passage is simulated via `cy.travel()`; the two `sweep-preorders` invocations are explicit job triggers, not schedule-dependent.
- **Checkbox assertions use `force: true`**: the Late/Due-soon filter checkboxes are toggled with `force` to work around potential overlay or visibility issues in the table.
- **`requires-module` comment** at the top lists the backend modules (`account`, `cart`, `delivery`, `inventory`, `orders`, `payments`, `products`) that must be loaded for this journey to run; it is a documentation convention, not enforced code.
- **Order title includes `Date.now()`** to guarantee uniqueness across parallel or repeated runs.
