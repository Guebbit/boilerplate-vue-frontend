---
source: tests/e2e/specs/journeys/fr18-keyboard-only-warehouse-shift.cy.ts
sha256: ecf8e51c0544cc7bd30b4f00592cc93461c0eb98406afe6851d87674a0bda0de
signature: ce93aa0a37311bf090c5103e3287c2603d29a9a14bc6d2519da95c8db4888e65
generated_at: 2026-11-10T07:05:50.917163+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr18-keyboard-only-warehouse-shift.cy.ts

## Purpose

End-to-end Cypress test (FR18) that verifies a warehouse user can complete an entire order lifecycle — sign in, start a paid express order, ship it with a tracking code, cancel the ship dialog, re-ship, and mark it delivered — using **only** keyboard input (Tab, typing, Enter, Escape) with zero pointer/click interactions. The test asserts the order ends in `delivered` state via the API.

## Key elements

- **`TRACKING_CODE`** – Constant (`FR18-TRACK-001`) used as the tracking number in the ship dialog.
- **`OrderStatus`** – Interface mirroring the order payload the admin API returns (`status`, optional `fulfillmentStatus`).
- **`activate(selector)`** – Helper that focuses a `data-test` control, asserts it is not disabled and currently focused, then presses a real `Enter` key. This is the test's replacement for a click.
- **`describe / it` block** – Single test case that walks the full warehouse shift:
  - Keyboard-only login (email → Tab → password → Enter) plus TOTP two-factor via `cy.task('loginTotpCode')`.
  - Navigates to a pre-seeded `order.paidExpress` subject.
  - Starts the order via `activate('[data-test=mark-started]')`.
  - Opens the ship dialog, types the tracking code, presses **Escape**, verifies focus returns to the trigger and the API status is *not* `shipped`.
  - Reopens the dialog, types the code, presses **Enter**, confirms the code appears on the order page.
  - Marks delivered via `activate('[data-test=mark-delivered]')` and asserts API status equals `delivered`.

## Relationships

No graph neighbors are registered for this file. It is a leaf test spec.

## Notes

- **`requires-module: account, delivery, orders`** — The test depends on all three seed modules; ensure they are loaded in the test environment or the subjects will be missing.
- **No pointer events** — Every interaction uses `cy.realPress`, `cy.realType`, or `cy.focused()`. Any test step that introduces a `.click()` or `.click({ force })` defeats the purpose of this spec.
- **`cy.restore()`** is called in `beforeEach` between two `cy.visit('/en')` calls, resetting DB state per test.
- **TOTP flow** — The warehouse account requires 2FA. The test generates the code server-side via the `loginTotpCode` Cypress task rather than computing it client-side.
- **`cy.step(...)`** is a custom command (likely from a BDD-style reporting layer) used to label logical sections; it does not perform an assertion.
- **Escape verification** — After pressing Escape the test asserts both UI state (dialog gone, focus back on `[data-test=open-ship]`) *and* API state (status ≠ `shipped`), guarding against a "silent ship on close" regression.
