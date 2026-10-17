---
source: src/modules/users/tests/e2e/users.visual.cy.ts
sha256: 7e0ce7046c3719336ab6e12382cd2a8e723b083c3c144112e391839128db8f75
generated_at: 2026-10-17T01:47:13.123599+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/e2e/users.visual.cy.ts

## Purpose

Declarative visual-regression route list for the users module. It registers the routes and selectors that the shared `sweepVisual` helper will screenshot and compare, so the users module's e2e visual suite knows *what* to capture without duplicating sweep logic.

## Key elements

- **Module-level call `sweepVisual('users', routes, 'admin')`** — registers one route (`users-list` → `/en/users`, anchored at `#users-list-page`) under the `users` module, authenticated as `admin`. The call is the sole statement in the file; there are no exports.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides the `sweepVisual` helper that this file calls. The helper is responsible for the actual screenshot capture, baseline comparison, and diff reporting; this file only supplies the route table and role.

## Notes

- Not included in `npm run complete`. Run explicitly with `npm run test:e2e:visual`.
- Re-recording baselines (`npm run test:e2e:visual:update`) is expected only *after* visually inspecting the diff image—never blindly.
- The file is a pure configuration entry: adding a new visual check means appending a `[name, path, anchor]` tuple to the routes array, not writing new test logic.
