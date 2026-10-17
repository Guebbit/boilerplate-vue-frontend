---
source: src/modules/inventory/tests/e2e/inventory.visual.cy.ts
sha256: 321cc6e68906577b5180132236bc236513bd505135aad3be8800570ed1363ae3
generated_at: 2026-10-17T00:59:50.791400+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/inventory.visual.cy.ts

## Purpose

Declares the visual-regression screen list for the inventory module. It tells the shared `sweepVisual` harness which URL to load, which selector signals the page is ready to photograph, and under which role to run. The file exists so that deleting the inventory module also removes its baselines (they live in a sibling `__snapshots__/` folder).

## Key elements

- **`sweepVisual('inventory', [...], 'admin')`** — The single call that registers one screen. Arguments:
  - `'inventory'` — module/screen identifier used for the snapshot file name.
  - `['inventory-ledger', '/en/inventory', '[data-test=level-row]']` — label, URL path, and the *ready* selector (a board row, not the page shell, so a loading-state baseline is never captured).
  - `'admin'` — the role/permission level under which the screen is rendered.
- **`sweepVisual`** (imported) — the generic visual-sweep runner; this file contributes only the screen definition, no test logic.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function that this file calls. That file handles navigation, waiting on the ready selector, capturing the screenshot, and comparing against the stored baseline. This file supplies *what* to capture and *where* the baselines live.

## Notes

- Baselines (PNGs) are stored in `__snapshots__/` **beside this file**, not in a central snapshots directory. Deleting the module folder removes its photographs automatically.
- This suite is **excluded** from `npm run complete`. Run it explicitly with `npm run test:e2e:visual`.
- Re-recording is done with `npm run test:e2e:visual:update`, but the module doc explicitly warns: you must **inspect the diff image** before accepting. Blind re-recording defeats the purpose of the suite.
- The ready selector targets `[data-test=level-row]` (a data row), not a layout shell element, to avoid baselining a stable but meaningless loading state.
