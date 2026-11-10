---
source: src/modules/wishlist/tests/e2e/wishlist.visual.cy.ts
sha256: 36b286308f6ee1765ede5f2ee034f7fb52fa3a6143dced07269f836eca26a4ec
signature: 36b286308f6ee1765ede5f2ee034f7fb52fa3a6143dced07269f836eca26a4ec
generated_at: 2026-11-10T06:20:00.120526+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/e2e/wishlist.visual.cy.ts

## Purpose

Visual regression test for the wishlist screen. It registers the module's screens with the shared `sweepVisual` helper so that pixel-level baselines are captured and compared. The file exists per-module (rather than in a central location) so that deleting the wishlist module also removes its snapshot PNGs.

## Key elements

- **`sweepVisual('wishlist', [['wishlist', '/en/wishlist', '#wishlist-page']], 'user')`** — the sole call in the file. It tells the visual-sweep runner:
  - module name: `wishlist`
  - screens: one entry with label `wishlist`, route `/en/wishlist`, and a stability selector `#wishlist-page`
  - auth role: `user`
- **Import: `sweepVisual`** from `tests/support/e2e/visual-sweep.ts` — provides the actual screenshot-capture/diff logic; this file only supplies the screen list.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — This file calls `sweepVisual`, the exported function from that module. All sweep mechanics (viewport iteration, waiting for the stability selector, capturing, comparing, writing/updating baselines) live there; this file contributes only the wishlist screen definition and auth level.

## Notes

- Snapshots are stored in a `__snapshots__/` folder **beside this file**, not in a shared location.
- Not included in `npm run complete`. Run explicitly with `npm run test:e2e:visual`.
- Re-recording baselines (`npm run test:e2e:visual:update`) must always be preceded by visually inspecting the diff image; the file's doc comment flags re-recording without review as the primary failure mode for this suite.
- The file is intentionally minimal (one call). Adding a new wishlist screen means appending another entry to the array-of-arrays, not writing new test logic.
