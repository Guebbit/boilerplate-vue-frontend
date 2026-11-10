---
source: tests/support/e2e/apply-viewport.ts
sha256: b6fe0928b8125e9234ef71faeedf2b032089e22591f3aea86541f49d2151618e
signature: 4877838114667bda05d18a5f6e9e89fef00b45f719293a7837739a814fb6b4c2
generated_at: 2026-11-10T07:27:38.190381+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/apply-viewport.ts

## Purpose

Single entry point for resizing the Cypress browser to a named device profile. It sets the viewport dimensions, toggles touch emulation, and immediately asserts the window actually received the requested size—so a silently clamped window fails at the point of setup rather than surfacing as a confusing assertion failure deep in a spec.

## Key elements

- **`applyViewport(name: ViewportName)`** — The only export. Looks up the entry in `VIEWPORTS`, calls `cy.viewport(width, height)`, then enables touch (`cy.enableTouch()`) or resets it (`cy.resetTouch()`) based on the entry's `touch` flag. Finishes with a `cy.window()` assertion that `innerWidth`/`innerHeight` match the requested dimensions.

## Relationships

- **`scripts/e2e/viewports.ts`** — Provides the `VIEWPORTS` record and the `ViewportName` type. This file is its sole consumer in the support layer; every named size (phone, tablet, etc.) originates there.
- **E2E specs** (`orders.cy.ts`, `product-write.cy.ts`, `resilience.cy.ts`, `entity-translations.cy.ts`, `fr5-shopping-on-a-phone.cy.ts`, `keyboard.cy.ts`, `layout-checks.cy.ts`, `touch.cy.ts`) — Call `applyViewport` in `beforeEach`/`before` blocks to establish a deterministic device context before exercising UI.
- **Sweep helpers** (`a11y-sweep.ts`, `action-table.ts`, `sweep-state.ts`, `visual-sweep.ts`) — Peer support utilities in the same directory; they operate *after* a spec has already applied a viewport, so they inherit the device context this function sets up.

## Notes

- The post-`cy.viewport` assertion exists because Cypress can scale the app iframe when the *browser window* is smaller than the requested viewport, yet the page still reports the larger viewport size. Without the check, a clamped window would pass silently and produce misleading results.
- Touch state is *reset*, not merely left alone, when `touch` is `false`. This prevents a previous spec's `cy.enableTouch()` from leaking into a viewport that should simulate a pointer-only device.
- The function is synchronous in its Cypress-chain sense (no `async`/`await`); it returns `void` and relies entirely on the command queue.
