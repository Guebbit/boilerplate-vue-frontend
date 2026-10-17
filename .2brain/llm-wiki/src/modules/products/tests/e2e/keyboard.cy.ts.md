---
source: src/modules/products/tests/e2e/keyboard.cy.ts
sha256: fe8c9801861e76298086c7b537c7eda2789bb693ccb71f726640feb29ed8e809
generated_at: 2026-10-17T01:29:14.036233+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/keyboard.cy.ts

## Purpose

E2E test verifying that a products-list facet chip responds correctly to keyboard activation (Enter and Space). It lives in the `products` module rather than the central `tests/e2e/specs/` shell because the facet chip is a module-specific control and the shell-level spec should not depend on this module being present.

## Key elements

- **`describe('keyboard')`** — top-level suite; the sole grouping for keyboard-interaction tests in this module.
- **`beforeEach`** — visits `/en` and calls `cy.restore()` (presumably a custom command that resets application state / localStorage).
- **`it('toggles a facet chip with Enter and with Space')`** — the single test case. Visits `/en/products`, focuses the first `[data-test=category-chip]`, presses Enter (expects `aria-pressed="true"`), then presses Space (expects `aria-pressed="false"`).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- Relies on a custom Cypress command `cy.restore()` that is not defined here; it must be registered elsewhere in the test support files.
- Uses `cy.focused().realPress(...)` (Cypress Real Press plugin) rather than `.type('{enter}')`, indicating a preference for simulating raw key events to exercise actual `keydown`/`keyup` handlers.
- The `data-test=category-chip` selector is the contract with the component under test; renaming that attribute in the UI will break this spec.
