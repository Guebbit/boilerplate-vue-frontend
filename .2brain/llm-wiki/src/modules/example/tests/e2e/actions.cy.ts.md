---
source: src/modules/example/tests/e2e/actions.cy.ts
sha256: d9b952c71d938e941779417d15197d07c36c44956946d34ccee856c198757ecd
signature: d9b952c71d938e941779417d15197d07c36c44956946d34ccee856c198757ecd
generated_at: 2026-11-10T04:24:08.258047+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/e2e/actions.cy.ts

## Purpose

Cypress end-to-end test that verifies the example module's UI resilience: each user-facing action (create, edit, delete ×2, status move) is forced to fail via a server-fault stub, and the test asserts the page shows the correct alert, preserves any typed input or visible row, then succeeds on retry once the stub is removed. This file is the canonical template that new modules copy when adding their own `actionTable` coverage.

## Key elements

- **`EDITOR_PUBLISHED`** — Pinned MongoDB ObjectId (`65e1a0000000000000000e01`) for the editor's seeded published example; also the ID the a11y sweep edits.
- **`actionTable('example', […])`** — The single top-level call. Passes a module name and an array of five row objects to the shared runner, which executes each row's lifecycle (prepare → intercept → trigger → assert alert/state → unstub → retry → assert success).
- **Row objects** — Each describes one failure scenario:
  - `kind: 'form'` rows (create, edit) use `control` (selector for the submit button) and `prepare` (fills inputs before triggering).
  - `kind: 'row'` rows (delete ×2, status move) use `listed` (selector that must remain visible after the failure).
  - `intercept` specifies `method`, `url` glob, and `operation` (OpenAPI-style path) so the runner can stub the correct request.
  - `alert` / `message` identify the UI alert element and expected text to assert.

## Relationships

- **`tests/support/e2e/action-table.ts`** — Provides the `actionTable` runner. This file supplies only the data (route, selectors, intercept config, expected alerts); all orchestration (stubs, assertions, retry logic) lives in the runner.

## Notes

- This file is explicitly a copy-paste starting point for other modules; the file-level doc comment states "This is the table a new module copies."
- The two `kind` values (`form` vs `row`) change which assertion the runner performs: form rows check that typed values persist and the same control is still clickable; row rows check that a listed element remains in the DOM.
- Delete scenarios involve a confirmation dialog (`app-dialog-confirm`), so `trigger` is a two-step click rather than a single action.
- The `operation` field in each `intercept` object mirrors OpenAPI operation paths (e.g., `/examples`, `/examples/{id}`, `/examples/{id}/archive`), implying the runner may resolve stubs by operation ID rather than raw URL alone.
