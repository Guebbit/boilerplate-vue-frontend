---
source: src/modules/products/tests/e2e/keyboard.cy.ts
sha256: 72059f2b26a031784b5b505f5afd6476137602d018d044e7795584001c1eb564
signature: 72059f2b26a031784b5b505f5afd6476137602d018d044e7795584001c1eb564
generated_at: 2026-11-10T05:22:46.168055+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/keyboard.cy.ts

## Purpose

Cypress E2E spec that verifies the products-list facet chip responds correctly to keyboard activation (Enter and Space). It lives inside the products module rather than the central `tests/e2e/specs/` directory because the facet chip is a module-level control and shell-level specs should not depend on this module being present.

## Key elements

- **`describe('keyboard')`** — single test block; `beforeEach` visits `/en` and calls `cy.restore()` (fixture/DB reset).
- **`it('toggles a facet chip with Enter and with Space')`** — navigates to `/en/products`, focuses the first `[data-test=category-chip]`, presses **Enter** via `realPress`, asserts `aria-pressed="true"`, then presses **Space** and asserts `aria-pressed="false"`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The file header comment explicitly documents *why* the spec is co-located with the products module instead of the central E2E spec folder — treat this placement as intentional, not accidental.
- Tests use `cy.realPress()` (real keyboard events) rather than `cy.type()`, so the assertions validate the actual `keydown`/`keypress` → `click` flow, not a synthesized click.
- The `beforeEach` hits `/en` (not `/en/products`) before the individual test navigates further; if the app's root route changes, this hook will fail.
