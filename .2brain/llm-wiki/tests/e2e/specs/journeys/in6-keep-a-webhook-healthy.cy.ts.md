---
source: tests/e2e/specs/journeys/in6-keep-a-webhook-healthy.cy.ts
sha256: a91cea665907a02c5467675ab60152c8ac78e15573b4abae0c4438eb7fcd0703
generated_at: 2026-10-17T02:17:43.990279+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/in6-keep-a-webhook-healthy.cy.ts

## Purpose

Journey test (IN6) that exercises the full webhook-subscription lifecycle from the manager UI: SSRF-guard refusal of unsafe URLs, one-time secret reveal/rotation/removal, enable/disable toggling, delivery verification against an order, and deletion. It deliberately runs as the *manager* role to confirm webhooks are not an admin-only feature.

## Key elements

- **`endpoint`** (module-level `let`) – the unique sink URL for the current run; populated in `beforeEach` via `sinkEndpoint('/in6-${Date.now()}')`.
- **`REFUSED_ADDRESS`** – constant (`'cannot be a webhook target'`) matching the SSRF-guard error text shown in the form.
- **`submitTheCreateForm(address)`** – clears and types the webhook URL input, then submits the create form.
- **`readAndDismissTheSecret()`** – reveals a one-time signing secret, asserts the `whsec_` prefix, reads the text, clicks through the confirm/continue dialogs, and returns the secret in a `Cypress.Chainable<string>`.
- **`describe('IN6 · Keep a webhook healthy from the UI')`** – single `it` block containing the whole journey as a sequence of `cy.step` segments; `beforeEach` restores DB state and registers a fresh sink endpoint.

## Relationships

- **`tests/support/e2e/integrator.ts`** – provides `sinkEndpoint` (creates a unique receiver path on the seeded demo origin), `placeOrderAsCustomer` (triggers an `order.created` event), `seededSubscription` / `deliveriesOf` (query the seeded subscription's delivery log via API), and `setEnabledInTheForm` (toggles a subscription's enabled flag through the UI form).
- **`tests/support/e2e/steps.ts`** – provides `eventually`, a polling helper that retries an async predicate until it passes or times out.

## Notes

- The file is a single `it` block, not one-per-step. Each logical segment is a `cy.step(...)` call; failures point to a step name rather than a test name.
- The delivery-status assertion is *dynamic*: it reads the `data-status` attribute actually rendered on the row, then verifies that filtering by that status shows the row and filtering by the opposite status hides it. This accommodates profiles where the seeded receiver may succeed or exhaust retries.
- The SSRF guard exempts only the seeded receiver's origin; the test exploits this by generating its sink path *on that origin* (`sinkEndpoint`). Any other private/HTTP address is expected to be refused.
- `requires-module: account, cart, orders, products, webhooks` at the top lists the server modules the test depends on; omitting any will cause fixture/seed failures.
- The secret is asserted to match `/^whsec_/` and must **not** be visible in the page body after dismissal—this is the "shown once" guarantee.
