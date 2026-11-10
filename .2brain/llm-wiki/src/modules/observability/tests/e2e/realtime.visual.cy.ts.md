---
source: src/modules/observability/tests/e2e/realtime.visual.cy.ts
sha256: 25d92887e08b8530013281fc9028abb7a519cfd76832cd7221e4e1ead000eaba
signature: 25d92887e08b8530013281fc9028abb7a519cfd76832cd7221e4e1ead000eaba
generated_at: 2026-11-10T04:54:55.872159+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/e2e/realtime.visual.cy.ts

## Purpose

Declares the **realtime** playground screen to the shared visual-sweep runner so that a screenshot can be captured and diffed against a stored baseline. It exists to catch unintended visual regressions in the realtime observability page without asserting specific DOM content.

## Key elements

- **`sweepVisual('realtime', …, 'admin')`** — single call that registers the screen with the visual-sweep harness. Arguments:
  - Name: `'realtime'`
  - Screen config: `[['realtime-playground', '/en/playground/realtime', '#realtime-playground-page']]` — test ID, target URL, and the ready-selector the runner waits for before capturing.
  - Context: `'admin'` (auth/role variant used by the runner).
- **Import:** `sweepVisual` from `tests/support/e2e/visual-sweep`.

## Relationships

- **→ `tests/support/e2e/visual-sweep.ts`** — the only dependency; provides the `sweepVisual` function that handles navigation, ready-waiting, screenshot capture, and baseline diffing.

## Notes

- **Not included in `npm run complete`.** Run explicitly with `npm run test:e2e:visual`.
- **Baseline re-recording** (`npm run test:e2e:visual:update`) should only happen after visually inspecting the diff image — the JSDoc calls this out explicitly.
- The ready selector `#realtime-playground-page` gates the screenshot; if that element is renamed or removed, the test will hang or capture an unrendered page.
