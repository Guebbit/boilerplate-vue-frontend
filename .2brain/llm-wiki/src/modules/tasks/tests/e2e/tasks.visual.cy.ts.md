---
source: src/modules/tasks/tests/e2e/tasks.visual.cy.ts
sha256: f4eb865d83eaf14ed7217dcfdfb9e024be8f372b9c9ca4ff8ed26c30b4dbfb1b
signature: f4eb865d83eaf14ed7217dcfdfb9e024be8f372b9c9ca4ff8ed26c30b4dbfb1b
generated_at: 2026-11-10T05:59:13.137898+00:00
model: ollama:qwen3.8:27b
---

# src/modules/tasks/tests/e2e/tasks.visual.cy.ts

## Purpose

Declares the visual-regression routes for the **tasks** module. It feeds a list of page targets to the shared `sweepVisual` helper so that each route's rendered output is captured as a screenshot for pixel-level comparison. The file exists purely as a route manifest; all sweep logic lives in the shared helper.

## Key elements

- **`sweepVisual('tasks', …)` call** — Registers one route entry for the tasks module:
  - Label: `'contact'`
  - URL: `'/en/contact'`
  - Target selector: `'#contact-page'`
- **Import of `sweepVisual`** — Pulled from the shared visual-sweep helper (see Relationships).

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function that this file calls. The helper handles navigation, waiting for the selector, and taking/comparing screenshots. This file is a pure consumer; it adds no logic of its own.

## Notes

- **Not in the default e2e suite.** This file is excluded from `npm run complete`. It runs only via the dedicated commands:
  - Run: `npm run test:e2e:visual`
  - Re-record baselines: `npm run test:e2e:visual:update`
- **Manual review required before re-recording.** The file header explicitly warns to *look at the diff image* before running the `:update` variant—blindly updating baselines can mask regressions.
- **Single-route file.** Currently only the `/en/contact` page is swept. Adding new task-module pages means appending entries to the same `sweepVisual` call.
