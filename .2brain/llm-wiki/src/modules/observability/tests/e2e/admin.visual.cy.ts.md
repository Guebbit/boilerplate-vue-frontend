---
source: src/modules/observability/tests/e2e/admin.visual.cy.ts
sha256: 57e132b75699cd0fa01913d2af8e56f55f50a35d8a1cc678514d64eb9adda407
generated_at: 2026-10-17T01:12:37.996592+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/e2e/admin.visual.cy.ts

## Purpose

Defines the visual-regression screen list for the observability module's admin dashboard. It tells the shared sweep helper which route to visit, what selector signals the page is ready, and which live-changing elements to redact before snapshotting. The file itself contains no test logic — it is purely declarative configuration.

## Key elements

- **`sweepVisual('admin', [ … ], 'admin')`** — Single call that registers one screen entry for the visual suite.
- **Screen entry `admin-dashboard`** — Target route `/en/admin`; readiness gated on `#admin-page` appearing in the DOM.
- **`redact` array** — CSS selectors for elements that change on every run (clock, uptime, request/error counters, latency KPI cards 5–10) and are excluded from the pixel comparison. Status cards 1–4 remain photographed.
- **Baseline location** — Snapshots are stored in a `__snapshots__/` folder *beside this file*, so removing the module also removes its PNGs.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — Provides the `sweepVisual` function that iterates over the screen list, navigates to each route, waits for the ready selector, applies redactions, and produces/compares the snapshot. This file is the only consumer in the observability module.

## Notes

- **Not in the default suite.** Excluded from `npm run complete`; invoke via `npm run test:e2e:visual`.
- **Re-recording is deliberate.** `npm run test:e2e:visual:update` should be run *only after* visually inspecting the diff. Blindly re-recording defeats the purpose of the suite.
- **Co-located baselines are intentional.** A central snapshot folder would leave orphaned PNGs after a module is deleted; placing them beside the source avoids that.
- **Redaction selectors are positional.** `.v-card:nth-child(n+5)` targets the 5th+ KPI cards specifically; if card order changes, the redaction list must be updated in lockstep.
