---
source: tests/e2e/specs/journey.cy.ts
sha256: c4ddeb49a97592b9f381063f390107951d42e49d6787a127ff7c932b19586057
signature: c4ddeb49a97592b9f381063f390107951d42e49d6787a127ff7c932b19586057
generated_at: 2026-11-10T06:44:04.482906+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journey.cy.ts

## Purpose

A single end-to-end Cypress test that walks the full shop lifecycle as a real user would: a guest browses products and hits the sign-in wall, then an authenticated customer filters, buys, checks out, cancels, and verifies the shelf restocks. All post-login navigation is done through in-app links and buttons (no deep `cy.visit`), so surviving state across steps proves the flow shares one session.

## Key elements

- **`beforeEach`** — Visits `/en`, calls `cy.restore()` to clear the server-side session, then reloads `/en` so the page genuinely boots as a guest.
- **`stockBeforeBuying`** — Module-level variable; captured via admin API (`cy.apiAs('admin', 'GET', /products/:id)`) before purchase and asserted as restored after cancel.
- **Guest phase** — Navigates to products, filters to `product.rich`, verifies the product card shows "In stock" text (never a numeric count), confirms add-to-cart is enabled but a "Sign in to check out" wall exists, and that no wishlist toggle is present.
- **Login** — `cy.loginAs('user')`; the journey's only page reload.
- **Customer purchase** — Re-filters, adds to cart, goes to cart, checks out with `standard` shipping, lands on the order page.
- **Email assertion** — Reads the confirmation email from the seeded outbox (skipped when `liveProfile` is true) and asserts the template is `orders.order-confirm`.
- **Cancel** — Clicks cancel on the order page, confirms via the app's own dialog, verifies the cancel button is gone and a reorder button appears.
- **Stock recovery** — Dismisses stacked toast alerts, navigates back to products (filter still active), re-checks the product, and retries the admin API until `available` equals `stockBeforeBuying`.

## Relationships

- **`tests/support/e2e/commands.ts`** — Imports `expectMailTemplate`, used to assert the confirmation email's template identifier is `orders.order-confirm`.
- **`tests/support/e2e/scenario.ts`** — Imports `seedAccount`, used to resolve the seeded account's email address for the outbox lookup.

## Notes

- **Filter is toggle-based.** Navigating back to `/en/products` after cancel keeps the active filter. Re-clicking the category chip would *remove* the filter, causing the row assertion to fail. The test relies on the filter persisting.
- **Toasts overlay the action column.** `.v-alert` toasts stack over the product table's buttons; they must be dismissed (`.v-alert__close button`) before clicking through the list again.
- **Stock count is admin-only.** The shopper-facing UI renders "In stock" text and never a number. The actual count is only verifiable via the admin API.
- **Single reload invariant.** After login, no full page load occurs. Any accidental reload would drop all client-side stores and break the "shared session" guarantee the test is designed to prove.
- **`requires-module` header.** The leading comment (`// requires-module: cart, inventory, orders, products`) signals that the test harness must have those four feature modules enabled before running this spec.
