---
source: src/modules/inventory/tests/e2e/inventory.visual.cy.ts
sha256: 5595b0f73b73f1680c6a6dcf62d91c3ba8096143028bd86a54eeb3279e799fd5
signature: 5595b0f73b73f1680c6a6dcf62d91c3ba8096143028bd86a54eeb3279e799fd5
generated_at: 2026-11-10T04:33:06.921751+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/e2e/inventory.visual.cy.ts

## Purpose

Defines the visual-regression screen list for the inventory module. It declares *which* routes and viewports to photograph; the actual capture logic lives in a shared helper. It exists so that deleting the inventory module also removes its baselines (they co-locate in a sibling `__snapshots__/` folder).

## Key elements

- **`sweepVisual('inventory', screens, 'admin')`** — Single call that registers one screen:
  - **`inventory-ledger`** — route `/en/inventory`, ready on `[data-test=level-row]`, captured at `desktop` and `phone` viewports.
- **`readySelector: '[data-test=level-row]'`** — A board row, deliberately not the page shell, so the baseline captures a rendered table + movement form rather than a stable, meaningless loading skeleton.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function. This file is its caller: it supplies the module name, the screen descriptor array, and the role. All viewport iteration, waiting, screenshotting, and baseline comparison happen inside the helper.

## Notes

- **Not in `npm run complete`.** Invoke with `npm run test:e2e:visual`; re-record with `npm run test:e2e:visual:update`.
- **Re-recording without inspecting the diff invalidates the suite.** The module docblock calls this out explicitly as the single failure mode to avoid.
- **Baselines are co-located** (`__snapshots__/` next to this file) by design — a central snapshot folder would orphan PNGs after the module is removed.
- The role passed is `'admin'`; the suite assumes that user has access to `/en/inventory`.
