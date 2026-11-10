---
source: src/modules/shop-tasks/tests/e2e/nav-badges.cy.ts
sha256: ab4422fc227d9f3978cf31036857510797dab92fe3006a495f33727b7ca1ccda
signature: ab4422fc227d9f3978cf31036857510797dab92fe3006a495f33727b7ca1ccda
generated_at: 2026-11-10T05:43:32.047933+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/tests/e2e/nav-badges.cy.ts

## Purpose

E2E test verifying that the **Sales → Orders** badge in the staff nav reflects *open work* (the `salesOrders` count from `GET /shop-tasks/summary`) rather than *unread notices*. It asserts the badge value is unchanged after the notifications bell is opened (which marks every notice read server-side).

## Key elements

- **`describe('Staff nav badges')`** – single test suite scoped to the nav badge behaviour.
- **`beforeEach`** – visits `/en` and calls `cy.restore()` to re-seed the demo profile (guarantees paid orders exist).
- **Test: "the orders badge shows the open orders and survives opening the bell"**
  1. Logs in as `admin` via `cy.loginAs`.
  2. Fetches `GET /shop-tasks/summary` with `cy.apiAs`, reads `summary.salesOrders`.
  3. Asserts the count is `> 0` (guards against an empty demo seed).
  4. Opens the admin menu and reads the `.v-badge__badge` on the `/en/sales/orders` link, asserting it contains the API value.
  5. Clicks `[data-test=notifications-bell]`, confirms the panel is visible, then closes it (`{esc}`).
  6. Re-opens the admin menu and asserts the badge text is still the original `open` value.

## Relationships

No dependency-graph neighbours are recorded for this file. It is a leaf test that only depends on the application under test (the `/en` UI) and the `/shop-tasks/summary` API.

## Notes

- The test depends on `cy.apiAs` and `cy.restore` being defined in a shared Cypress support file (not in this file).
- `beforeEach` re-seeds data on every run; the `open > 0` assertion is the safety net that the seed actually produced paid orders.
- Badge text is matched with `contain.text`, not exact equality, so suffix/prefix whitespace in the Vuetify `.v-badge__badge` element won't cause a false failure.
- Escape key (`{esc}`) is the convention for dismissing the admin menu and notifications panel; no close-button clicks are used.
