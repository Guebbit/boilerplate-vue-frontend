---
source: src/modules/stock-alerts/tests/notify-me-button.spec.ts
sha256: 64bbda1dbdaa1437d3c528ee541d98cc2f697fc3d83b7c6c30e843c0ca6bd2af
signature: 0a753025fc934859b5ab4f4db11c4aac0f3cfd63a07b13fa427c6b710c9b7afd
generated_at: 2026-11-10T05:55:35.184316+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/tests/notify-me-button.spec.ts

## Purpose

Vitest spec for the `NotifyMeButton` component. It verifies the button's visibility contract (hidden for guests and for any orderable product; shown for sold-out or non-purchasable items) and its toggle behavior—asking for an alert, cancelling an existing one, and surfacing a write failure—without hitting a real transport.

## Key elements

- **`aProduct(overrides)`** – Factory returning a `Product` defaulting to sold-out, not low-stock. Computes `buyable` from `purchasable`/`inStock`/`backorder` and falls back to `NO_PRODUCT_ACTIONS` for `actions`.
- **`signIn()`** – Populates the session store with a test token and viewer so the component treats the user as authenticated.
- **`mountButton(product, asked)`** – Seeds the stock-alerts store with pre-existing alert ids, mocks `ensureStockAlerts` (no real fetch), and mounts `NotifyMeButton` with Vuetify + i18n plugins. Returns the store and the wrapper.
- **Test cases** – Cover: guest invisibility; orderable invisibility (in stock, preorder, backorder); non-orderable visibility (sold out, off sale); ask flow (store mutation + label change to "You'll be told"); cancel flow (works even when the product became orderable); error state (`[data-test=notify-me-error]` rendered, button blocked).

## Relationships

- **`src/modules/stock-alerts/components/NotifyMeButton.vue`** – The component under test; imported and mounted directly.
- **`src/modules/stock-alerts/store.ts`** – `useStockAlertsStore` is imported to pre-seed `items` and to spy on `ask`, `cancel`, and `ensureStockAlerts`.
- **`tests/support/unit/fixtures.ts`** – Supplies `NO_PRODUCT_ACTIONS`, used as the default `actions` array in the product factory.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to register module wiring before any test runs.

## Notes

- `wireModulesIntoCore()` executes at **module top level**, not inside `beforeEach`; it must run before the first `mount` but is not re-invoked between tests.
- `ensureStockAlerts` is always mocked to a resolved array—there is no real network call in any case. The in-source comment labels it "decoration on the page."
- The cancel test deliberately passes `inStock: true` *and* a pre-seeded alert for the same product, asserting that an open alert overrides the buyable flag and the button still renders.
- `flushPromises` appears only in the error test, where the rejected `ask` promise must resolve before the error element is asserted.
