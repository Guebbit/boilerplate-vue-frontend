---
source: tests/e2e/specs/journeys/in6-keep-a-webhook-healthy.cy.ts
sha256: 70488a7c8a11f83ab81dd1a3c4b50bac25227721ecca565d6871f2b1380e2b02
signature: 651bc78702f648aa1ebb7948a54cbd00dbd3f1ad03ba1edfa2411830070f9083
generated_at: 2026-11-10T07:09:32.073011+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in6-keep-a-webhook-healthy.cy.ts

## Purpose

End-to-end journey test (Cypress) verifying the full webhook-subscription lifecycle from the manager's UI: SSRF-guard refusal of unsafe addresses, one-time secret display/rotation/removal, pausing and re-enabling, list filtering, delivery behaviour while off vs. on, admin visibility, and final deletion. It exists to confirm that webhooks are a first-class manager capability and that the SSRF guard, secret ring, and delivery log all behave correctly through a realistic user flow.

## Key elements

- **`endpoint`** – Module-level variable holding the unique per-run subscription URL (a path on the seeded receiver's origin, the one address the SSRF guard exempts).
- **`REFUSED_ADDRESS`** – Constant string (`'cannot be a webhook target'`) matched against the SSRF-guard error in the create page.
- **`submitTheCreateForm(address)`** – Types a URL into the `[data-test=webhook-url]` input and submits the form.
- **`readAndDismissTheSecret()`** – Reads the revealed secret text (asserts `whsec_` prefix), dismisses the reveal dialog, and returns the secret as a `Cypress.Chainable<string>`.
- **`describe` / `it` block** – A single long journey test with sequential `cy.step` checkpoints covering: refusal, creation, secret rotation, removal, pause, filter, silent delivery, re-enable, delivery row, status filter, and deletion.
- **`beforeEach`** – Restores the DB, visits `/en`, and calls `sinkEndpoint` to mint a unique endpoint for the run.

## Relationships

- **`tests/support/e2e/integrator.ts`** – Supplies the domain helpers used throughout: `sinkEndpoint` (generates the unique receiver URL), `deliveriesOf` (fetches delivery rows for a subscription id), `placeOrderAsCustomer` (places a customer order to generate a delivery), `seededSubscription` (returns the shop's built-in webhook for the silent-delivery comparison), and `setEnabledOnTheDetailPage` (toggles a subscription's enabled flag via the detail page).
- **`tests/support/e2e/steps.ts`** – Provides `eventually`, a polling helper used to wait for delivery rows to appear after an order is placed.

## Notes

- The test runs as **manager**, not admin, deliberately — webhooks are not an admin-only feature. Admin visibility is checked via `cy.apiAs('admin', …)`.
- The endpoint is a **unique path on the seeded receiver's own origin**, the only private address the SSRF guard allows. This is why the guard refuses `http://example.com/…` (not https) and `https://10.0.0.1/…` (private IP) but accepts the seeded receiver URL.
- Delivery-status filtering is **conditional**: the test reads the `data-status` attribute from the rendered row, then asserts that filtering by that status finds the row while filtering by the opposite status does not. This accommodates receivers that may return success or failure depending on the seeded profile.
- The entire journey is a **single `it` block** with sequential `cy.step` calls — a deliberate "journey" style rather than independent assertions.
- Requires seeded modules: `account`, `cart`, `orders`, `products`, `webhooks` (see the `requires-module` comment).
