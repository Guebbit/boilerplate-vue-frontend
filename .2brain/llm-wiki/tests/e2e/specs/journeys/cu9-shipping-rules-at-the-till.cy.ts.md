---
source: tests/e2e/specs/journeys/cu9-shipping-rules-at-the-till.cy.ts
sha256: 2954919c23b967ae9c57dc4334eed18288c2f76f3167b0317aebae56ee7b8a6e
signature: 2954919c23b967ae9c57dc4334eed18288c2f76f3167b0317aebae56ee7b8a6e
generated_at: 2026-11-10T07:02:50.822428+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu9-shipping-rules-at-the-till.cy.ts

## Purpose

End-to-end test for CU9 ("Shipping rules at the till"). Verifies that the cart enforces every delivery rule the shop exposes at checkout: free-shipping threshold, weight-based method refusal with fallback, pickup requiring no shipping address, and rejection of an address in a non-supported country. All assertions read prices in cents from the rendered page and check server-side refusal messages; no payment/card logic is exercised.

## Key elements

- **`describe('CU9 · Shipping rules at the till')`** – Single suite with one `it` block that walks through five sequential `cy.step()` scenarios in one cart session.
- **`beforeEach`** – Visits `/en`, calls `cy.restore()` to reset persisted state, then visits `/en` again to get a clean page.
- **Step 1 – Free-shipping threshold** – Adds one `product.rich`, asserts standard shipping > 0 cents; increments to two, asserts 0 cents and the "free" label.
- **Step 2 – Weight refusal (stale UI)** – Injects a `product.heavy` via `cy.apiAs` POST behind the open page's back so the express radio is still visible; clicking it triggers the server error "Your basket is too heavy…" and the standard radio re-checks.
- **Step 3 – Post-reload method list** – After `cy.reload()`, asserts express is absent, standard and pickup are present.
- **Step 4 – Ship-to country refusal** – Adds a Paris address via `fillAddressDialog`, selects standard + that address, clicks checkout, asserts the refusal message and that the URL remains on `/cart`.
- **Step 5 – Pickup has no shipping address** – Switches to pickup, confirms no shipping/billing-same pickers, checks out, verifies the order has `billingAddress` but no `shippingAddress` (checked via `cy.apiAs` GET on the order).

## Relationships

- **`tests/support/e2e/steps.ts`** – Supplies the four imported helpers used throughout the spec: `addToCartFromStorefront` (adds a product by catalogue key to the cart), `shouldShowCents` (polls a `data-test` element and parses its cent value for assertions), `fillAddressDialog` (populates the address form with a given address object), and `idFromLocation` (extracts an ID from the current URL path).

## Notes

- The heavy-product step deliberately uses `cy.apiAs` POST *while the page is open* so the UI still shows the express radio. The refusal that follows is the server's response to a now-invalid choice — do not "fix" this by reloading first; the stale-UI scenario is the point.
- `shouldShowCents` is used instead of a plain `cy.get().should('contain.text', …)` because the step action is debounced and the DOM updates asynchronously.
- The file declares `requires-module: account, cart, delivery, inventory, orders, products` in a comment header — ensure those backend modules are booted before running this spec.
- The test is intentionally monolithic (one `it`, five steps) to model a single customer journey; splitting steps into separate `it` blocks would break the shared cart state.
