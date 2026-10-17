---
source: src/modules/observability/tests/e2e/realtime.visual.cy.ts
sha256: 25d92887e08b8530013281fc9028abb7a519cfd76832cd7221e4e1ead000eaba
generated_at: 2026-10-17T01:12:44.576028+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/e2e/realtime.visual.cy.ts

## Purpose

Registers the **realtime** observability screen for visual-regression testing. It declares the screen's URL and readiness selector to the shared `sweepVisual` runner, which then visits the page, waits for the selector, takes a screenshot, and diffs it against the stored baseline.

## Key elements

- **`sweepVisual` call** — Single statement that enrolls the screen into the visual sweep:
  - Screen name: `'realtime'`
  - Route / ready-selector pair: `realtime-playground` → `/en/playground/realtime`, ready when `#realtime-playground-page` is present
  - Auth role: `'admin'`

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function. This file is a pure registration; all orchestration (navigation, waiting, screenshot capture, baseline diffing, and test reporting) lives in the `visual-sweep` support module.

## Notes

- This file is **not** part of `npm run complete`. It runs via `npm run test:e2e:visual`.
- Baseline re-recording (`npm run test:e2e:visual:update`) should only be done **after visually inspecting** the diff image — do not blindly accept a regenerated baseline.
- The readiness gate is the CSS selector `#realtime-playground-page`; if the page renders content without that element, the sweep will time out waiting for "ready."
