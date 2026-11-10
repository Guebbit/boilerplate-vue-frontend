---
source: src/modules/users/tests/e2e/users.visual.cy.ts
sha256: 7e0ce7046c3719336ab6e12382cd2a8e723b083c3c144112e391839128db8f75
signature: 7e0ce7046c3719336ab6e12382cd2a8e723b083c3c144112e391839128db8f75
generated_at: 2026-11-10T06:06:08.975530+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/e2e/users.visual.cy.ts

## Purpose

Declares the visual-regression routes for the **users** module by delegating to the shared `sweepVisual` helper. It exists so that a single, consistent sweep mechanism can cover every module's visual baselines.

## Key elements

- **`sweepVisual('users', routes, 'admin')`** — Single call (the entire module body). Registers one route group:
  - Route label: `users-list`
  - URL: `/en/users`
  - Page-ready selector: `#users-list-page`
  - Auth role: `admin`

The file has no exports; it is a side-effect module that registers routes at load time.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function imported at the top. This file is a pure consumer; all sweep logic (screenshotting, naming, comparison) lives in that helper.

## Notes

- **Not part of `npm run complete`.** It runs only via `npm run test:e2e:visual`.
- **Re-recording baselines** requires `npm run test:e2e:visual:update` and should be done *after* visually inspecting the diff image, per the file's own doc comment.
- The route list is a two-dimensional array (`[label, url, selector]` triplets wrapped in an outer array), matching the shape `sweepVisual` expects for a single module.
