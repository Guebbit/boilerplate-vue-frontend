---
source: src/modules/tasks/tests/e2e/resilience.cy.ts
sha256: 9c7c9b90001349f4e330483f22bd9683ae61dde78acd4580a7d907cbdd723089
signature: 9c7c9b90001349f4e330483f22bd9683ae61dde78acd4580a7d907cbdd723089
generated_at: 2026-11-10T05:58:32.931212+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/e2e/resilience.cy.ts

## Purpose

The tasks module's contribution to the shell-level resilience sweep. It verifies that the public contact form and the staff inbox route render without console errors and fit the viewport. It deliberately asserts no specific content, deferring to the central resilience spec for that rationale.

## Key elements

- **`describe` block** — groups two resilience tests under a single heading; runs `cy.visit('/en')` + `cy.restore()` in `beforeEach` to reset state.
- **`it('serves the contact form…')`** — calls `assertRouteIsHealthy('/en/contact', '#contact-page')` to confirm the visitor-facing route is error-free and viewport-safe.
- **`it('serves the staff inbox…')`** — logs in as `admin` via `cy.loginAs`, then calls `assertRouteIsHealthy('/en/tasks', '#tasks-page')`.

## Relationships

- **Imports** `assertRouteIsHealthy` from `tests/support/e2e/resilience.ts`, the shared helper that performs the actual health assertion (console-error check + viewport check) for a given route and root selector.

## Notes

- The file intentionally does **not** assert specific text or values — that is by design, as stated in the header comment. Adding value assertions here would duplicate or conflict with the central spec's conventions.
- The inbox test requires admin authentication (`cy.loginAs('admin')`); the contact form test does not.
- Both tests rely on `cy.restore()` in `beforeEach` to clear any prior session/storage state.
