---
source: tests/e2e/specs/contract-hook.cy.ts
sha256: 737a371efd1c2164b3821a3eee11e13e7b47da6c85bbac8ef4efa47c6885b695
signature: 737a371efd1c2164b3821a3eee11e13e7b47da6c85bbac8ef4efa47c6885b695
generated_at: 2026-11-10T06:43:22.614377+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/contract-hook.cy.ts

## Purpose

A single-test positive control that proves the global `[contract]` hook actually fires and fails a test when the page logs a `console.error` containing `[contract]`. Without this check, a silently dead hook would be indistinguishable from a suite with no drift.

## Key elements

- **`describe('Contract hook')`** – suite containing one spec.
- **`it('fails the running test when the page logs a contract mismatch')`** – the only test. Visits `/en`, then triggers a `console.error('[contract] …')` from the page context and *expects* the test to fail because of it.
- **`expectContractFailure`** (inline `const`) – attached to both `cy.on('fail')` and `cy.on('uncaught:exception')`. Asserts the error message contains `[contract]`, calls `done()` to resolve the Mocha callback, and returns `false` to tell Cypress the exception was handled.
- **`cy.window().then(…)`** – accesses the page's `console.error` and `setTimeout` directly. Wraps the call in a `Cypress.Promise` that resolves after a 500 ms timer, ensuring the hook's own deferred throw has already executed by the time the chain continues.
- **Trailing `cy.then(…)`** – reached only if the hook did *not* fire; calls `done(new Error(…))` to fail the test, making the "no-failure" path the actual failure.

## Relationships

No graph neighbors. The only external reference is a header comment naming `tests/support/e2e/commands.ts` as the source of the hook under test; the file itself is loaded globally by the Cypress support-file mechanism and is not imported here.

## Notes

- The test deliberately inverts pass/fail semantics: the *expected* outcome is a test failure, which is intercepted and converted into a pass. If the hook is removed or broken, the test fails with a descriptive message instead.
- No imports; all globals (`cy`, `expect`, `describe`, `it`, `Cypress.Promise`) come from the Cypress/Mocha/Chai environment.
- `Cypress.Promise` (capital-C) is used rather than the native `Promise`, which is a Cypress-specific requirement for chaining inside `cy.then`.
- The 500 ms `setTimeout` inside the page is intentional: it guarantees the hook's own timer (which schedules the throw) fires *before* the promise resolves, so the `cy.then` that follows only runs if the hook never threw.
