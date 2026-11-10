---
source: src/modules/returns/tests/e2e/actions.cy.ts
sha256: a4d5329ae860a4c8d909eb4dd2938c6480d986f67052d5e4a2a810b151348f08
signature: a4d5329ae860a4c8d909eb4dd2938c6480d986f67052d5e4a2a810b151348f08
generated_at: 2026-11-10T05:39:30.566073+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/e2e/actions.cy.ts

## Purpose
End-to-end test for the returns module's failure path: verifies that when a buyer's withdrawal request is answered with a server fault, the withdraw button remains in the DOM and an error alert is displayed. Runs the scenario through the shared `actionTable` harness rather than writing bespoke Cypress steps.

## Key elements
- **`actionTable('returns', [ … ])`** — single registration call that hands one row definition to the shared runner.
- **Row: `"a failed withdrawal keeps the button and shows the alert, and a retry succeeds"`** — the only test case in this file. It:
  - Resolves the route via `cy.subjectId('order.paid')` → `/en/orders/:id`.
  - Triggers the flow by clicking `[data-test=withdraw-button]` then `[data-test=app-dialog-confirm]`.
  - Intercepts `POST **/returns` (operation `/returns`) to force a failure.
  - Asserts an alert with message `"The withdrawal failed"` (id `withdraw-error`) and that `[data-test=withdraw-button]` is still listed (i.e., not removed after the error).

## Relationships
- **`tests/support/e2e/action-table.ts`** — provides the `actionTable` runner. This file is a consumer: it supplies the module name and row objects; the runner handles the actual intercept-stub, trigger, and assertion sequence. All shared e2e action-table modules follow this same pattern.

## Notes
- The file is intentionally minimal—one row. If additional failure or edge cases are added to the returns action table, they belong here as extra objects in the same array.
- `kind: 'row'` distinguishes this from potential `'page'`-level entries; the runner treats them differently.
- The `intercept` entry keys on both a URL glob (`**/returns`) and an `operation` field (`/returns`); both must match for the stub to activate.
