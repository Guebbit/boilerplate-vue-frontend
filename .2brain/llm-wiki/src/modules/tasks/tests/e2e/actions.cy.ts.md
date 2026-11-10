---
source: src/modules/tasks/tests/e2e/actions.cy.ts
sha256: 5fa83f7c0f9ad4be7d05ee4166698e3735c3818c2fca41cdfabccf8297701083
signature: 5fa83f7c0f9ad4be7d05ee4166698e3735c3818c2fca41cdfabccf8297701083
generated_at: 2026-11-10T05:58:20.024178+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/e2e/actions.cy.ts

## Purpose

E2E test for the tasks page's failure and empty-state rows. It drives two scenarios through the shared `actionTable` runner: (1) a server-fault delete that must keep the row visible and surface an alert (with a working retry), and (2) an empty inbox that must render the page's empty state.

## Key elements

- **`actionTable('tasks', […])`** — the single top-level call that registers both scenario objects with the shared runner.
- **Scenario 1 – "a failed delete keeps the message listed and shows the alert, and a retry succeeds"** — seeds a task via a direct `POST /tasks` (with a timestamp-based `Idempotency-Key`), navigates to `/en/tasks`, clicks the first `[data-test=task-delete]` button and the confirm dialog, intercepts the `DELETE` request, then asserts the alert (`task-row-action-error`) is visible and the `[data-test=task-item]` row is still listed.
- **Scenario 2 – "an inbox with no messages shows its empty state"** — intercepts `POST **/tasks/search`, stubs a zero-item body validated against `SearchTasksResponse`, and asserts `.v-empty-state` appears while no `[data-test=task-item]` rows exist.

## Relationships

- **`tests/support/e2e/action-table.ts`** — exports the `actionTable` runner that this file calls. The runner interprets each scenario object (`persona`, `route`, `trigger`, `intercept`, `kind`, etc.) and drives the Playwright/Cypress steps.
- **`contracts/rest/schemas.zod.ts`** — exports the `SearchTasksResponse` Zod schema, imported here to validate the stubbed empty-state response body in scenario 2.

## Notes

- Scenario 1 deliberately seeds data through a raw `cy.request` POST *before* navigating, because the fixture inbox starts empty. The route function returns a wrapped `cy.wrap('/en/tasks')` so the runner still treats it as a navigation target.
- The `Idempotency-Key` header uses `Date.now()` to avoid collisions across repeated runs.
- Both scenarios use the `admin` persona; no non-admin path is covered in this file.
- `kind: 'row'` vs `kind: 'empty'` tells the `actionTable` runner which assertion template to apply (row-persistence + alert vs. empty-state copy + absence of rows).
