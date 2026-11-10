---
source: src/modules/tasks/tests/e2e/roles.cy.ts
sha256: f5f8e8ac4f6f5462837da35c55735721abdfe06ec850a927eca2c74d2d964015
signature: f5f8e8ac4f6f5462837da35c55735721abdfe06ec850a927eca2c74d2d964015
generated_at: 2026-11-10T05:58:41.006735+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/e2e/roles.cy.ts

## Purpose

Cypress E2E test that verifies role-based access to the tasks page. It declares *which* personas should be able to reach the tasks route and confirms the browser's rendered UI (menu link, page root element) matches what each persona's own permission rules dictate. The file lives inside the tasks module so that deleting the module removes this sweep automatically.

## Key elements

- **`sweepRoles('tasks', [...])`** — single top-level call (no exports). Passes the module name `'tasks'` and a one-entry case array. Each case specifies:
  - `name` / `route` — the human label and URL (`/en/tasks`) under test.
  - `can` — the permission pair the persona must hold (`read` on `Task`).
  - `menuHref` — the expected menu link the UI should render.
  - `pageRoot` — the CSS selector (`#tasks-page`) that must be present for authorized personas.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides the `sweepRoles` helper that iterates over all personas in the system and asserts each one's access (or denial) against the cases listed here. This file is purely the *case list*; all sweep mechanics live in the support module.

## Notes

- Marked `@module` — the file has no exports; it is a side-effect test (Cypress picks it up by the `.cy.ts` extension).
- Adding a new routable page or sub-route to the tasks module means adding another entry to the `sweepRoles` array here; there is no separate "register" step.
- The `can` field uses the app's internal permission model (`['verb', 'Resource']`), not a role name — the mapping from persona → permissions is resolved inside `role-sweep.ts`.
