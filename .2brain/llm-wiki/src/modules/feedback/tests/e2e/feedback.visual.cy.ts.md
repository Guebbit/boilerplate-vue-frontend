---
source: src/modules/feedback/tests/e2e/feedback.visual.cy.ts
sha256: 25dc85baf7315ef90b45b8792544e7a5f438ecda8764f994140c91c04d96e7eb
generated_at: 2026-10-17T00:56:16.834447+00:00
model: ollama:qwen3.8:27b
---

# src/modules/feedback/tests/e2e/feedback.visual.cy.ts

## Purpose

Declares the visual-regression routes for the feedback module. It is a side-effect-only Cypress spec that registers routes with the shared `sweepVisual` helper so that screenshot-based visual tests can be run against the feedback pages.

## Key elements

- **`sweepVisual('feedback', routes)`** — Call to the shared helper. Passes the module identifier (`'feedback'`) and a route table with a single entry:
  - `contact` — display name
  - `/en/contact` — URL path to visit
  - `#contact-page` — CSS selector scoping the screenshot region

The file has no exports; its sole effect is the `sweepVisual` invocation at load time.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function. This file is the consumer; `visual-sweep.ts` handles the actual screenshot capture, comparison, and diff logic. The route list defined here is the input that drives that process.

## Notes

- **Not included in `npm run complete`.** Run explicitly with `npm run test:e2e:visual`.
- **Re-recording snapshots:** use `npm run test:e2e:visual:update` only *after* visually inspecting the diff image. Blind re-recording can mask real regressions.
- Adding a new feedback route means appending another `[name, path, selector]` tuple to the existing array — no other wiring required.
