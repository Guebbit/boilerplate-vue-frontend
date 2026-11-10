---
source: src/modules/observability/tests/e2e/admin.visual.cy.ts
sha256: 3d64dc621ceb41901fbbd5cd06777e21862f5a1393cff69019b83311ce8bea4f
signature: 3d64dc621ceb41901fbbd5cd06777e21862f5a1393cff69019b83311ce8bea4f
generated_at: 2026-11-10T04:54:30.152534+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/e2e/admin.visual.cy.ts

## Purpose

Declares the visual-regression screen list for the admin dashboard. It calls the shared `sweepVisual` helper with a single route entry so that a baseline PNG is captured (or compared) for `/en/admin`. It exists so the observability module's own UI is covered by the project-wide visual suite while keeping its snapshot local to the module.

## Key elements

- **`sweepVisual('admin', [...], 'admin')`** — the sole top-level call. Registers one screen entry:
  - `name: 'admin-dashboard'` — identifier used in snapshot file names.
  - `route: '/en/admin'` — the URL the test navigates to.
  - `readySelector: '#admin-page'` — the element that must exist before the screenshot is taken.
  - `redact: [...]` — CSS selectors (two rules) that mask dynamic content (backend process clock, uptime, request/error counters, latency KPI cards 5–10) so they don't cause spurious diffs.

## Relationships

- **`tests/support/e2e/visual-sweep.ts`** — provides `sweepVisual`, the generic engine that navigates, waits for the ready selector, applies redactions, and performs the screenshot comparison/update. This file supplies only the screen configuration; all mechanics live in the support module.

## Notes

- **Not in `npm run complete`.** Run via `npm run test:e2e:visual`; re-record with `npm run test:e2e:visual:update` only after inspecting the diff image.
- **Baselines are co-located** in `__snapshots__/` next to this file. Deleting the module deletes its PNGs automatically—no orphaned baselines in a central folder.
- The redaction selectors target `nth-child(n+5)` KPI cards and muted `span.text-sm` text; if the admin layout changes those positions, the redaction rules must be updated in lockstep or the baseline will go stale for reasons unrelated to real regressions.
