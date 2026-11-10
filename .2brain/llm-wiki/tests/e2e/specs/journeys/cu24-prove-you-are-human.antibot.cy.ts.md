---
source: tests/e2e/specs/journeys/cu24-prove-you-are-human.antibot.cy.ts
sha256: 99b914997c7ae4ec648a3933216df39c51ef2b7f9484d1b38bd1d43a23dfce2a
signature: 6cca70e439ab851ccb9e00cda9903bb2ee729a3b53839994fb6ba859900ba847
generated_at: 2026-11-10T06:57:47.057422+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu24-prove-you-are-human.antibot.cy.ts

## Purpose

E2E journey test for the antibot (human-check) flow. Verifies that a logged-in customer's first card payment attempt carries no altcha widget (grace), that the widget appears and must be solved on retry after a decline, and that a guest's contact form always requires the check up front—refusing submission without a valid token (`ANTIBOT_VERIFICATION_FAILED`) and accepting it with one.

## Key elements

- **`TaskLike`** – minimal interface (`subject: string`) for admin task search results.
- **`tasksAbout(subject)`** – API helper that POSTs to `/tasks/search` as admin and returns matching task items; used to assert whether a contact submission created a task.
- **`writeToTheShop(subject)`** – fills the guest contact form (email, subject, message) and clicks submit, without interacting with the human-check widget.
- **`describe('CU24 · Prove you are human')`** – single test covering the full journey:
  1. First card attempt (declined) has no altcha widget.
  2. Second payment attempt shows the widget; order stays `pending` while unsolved.
  3. Solving the check and re-submitting moves the order to `paid`.
  4. Guest contact form shows the widget immediately; submission without token fails (no task created); with token succeeds (task created).

## Relationships

- **`tests/support/e2e/steps.ts`** – provides the shared step functions `addToCartFromStorefront`, `idFromLocation`, and `solveHumanCheck` used throughout the journey.

## Notes

- **Antibot shard only.** The test relies on `scripts/e2e/antibot-backend.ts` booting the `altcha` provider at low cost so a solve completes in milliseconds; it will fail or hang without that backend.
- **Module requirement.** The header comment declares `requires-module: account, cart, delivery, tasks, inventory, orders, payments, products`—all must be loaded for the test to pass.
- **`pickup` shipping method** is selected specifically because it requires no address, keeping the checkout path short.
- **`beforeEach` pattern** is `cy.visit → cy.restore → cy.visit`; the re-visit after restore is intentional to re-establish a clean session state.
- The test uses `cy.apiAs` (a custom command) to assert order status and task creation directly via the API rather than the UI.
