---
source: scripts/e2e/viewports.ts
sha256: 9a4171974e9f63df8d32d005135ff7eeaa1dcc62a92675c15d4e00ab885ec7cf
signature: b1e035655839f7cd5e88debcb3b2e89b654433a8392b997a7d173e5da11c4221
generated_at: 2026-11-10T02:38:15.971687+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/viewports.ts

## Purpose

A single-source-of-truth data module that defines every device viewport the browser test suites render the app at. It is pure data (no `cy`, no DOM) so it can be imported uniformly by Cypress config, Cypress support files, Vitest unit tests, and Node-side report tooling without pulling in a browser context.

## Key elements

- **`Viewport`** — interface for one device size: `width`, `height` (CSS px), `touch` (coarse-pointer flag), and `why` (one-line rationale).
- **`VIEWPORTS`** — the layout matrix (5 entries: `phone-small`, `phone`, `phone-landscape`, `tablet`, `desktop`). Frozen with `as const satisfies Record<string, Viewport>` so keys are literal and the shape is checked at compile time.
- **`ViewportName`** — union of the keys of `VIEWPORTS` (`'phone-small' | 'phone' | …`), used as a type-safe handle wherever a viewport is selected by name.
- **`REPORT_VIEWPORTS`** — a separate, smaller map (`lighthouse-mobile` 412×823) for sizes that report tooling needs but the main layout sweep does not cover.

## Relationships

- **`cypress.config.ts`** — imports `VIEWPORTS` to populate the `viewports` config array for every Cypress run.
- **`tests/support/e2e/apply-viewport.ts`** — consumes a `Viewport` object (including the `touch` flag) to configure the browser viewport and toggle touch emulation accordingly.
- **`scripts/lighthouse/settings.ts`** — reads `REPORT_VIEWPORTS['lighthouse-mobile']` for the mobile audit preset.
- **`tests/cross-cutting/viewport-matrix.spec.ts`** — iterates `VIEWPORTS` to drive cross-cutting E2E assertions at every breakpoint.
- **`tests/support/e2e/visual-sweep.ts`**, **`layout-checks.ts`**, **`a11y-sweep.ts`**, **`design-capture.ts`**, **`sweep-state.ts`** — import `VIEWPORTS` / `ViewportName` to know which sizes to sweep or which size is currently active.
- **`scripts/e2e/layout-findings.ts`** — references `VIEWPORTS` when emitting per-viewport layout findings.
- **`scripts/audit/design-manual/scripts/capture-matrix.ts`**, **`capture.ts`**, **`manifest.ts`** — consume the matrix to build the capture grid and manifest entries for the design-manual audit pipeline.

## Notes

- **`touch` is behavioural, not cosmetic.** It is the flag `apply-viewport.ts` reads to enable or disable touch emulation; setting it to `true` does not merely label the viewport.
- **`REPORT_VIEWPORTS` is intentionally separate.** Adding a size here does *not* add it to the layout sweep; the two maps grow independently.
- **Keys are load-bearing.** `ViewportName` is derived from the keys of `VIEWPORTS`; renaming or reordering keys is a breaking change for every importer that selects by name.
- **`why` is documentation, not data.** It is never read programmatically; it exists so a human (or AI) can see *why* a size is in the matrix without opening `docs/tools/visual-regression.md`.
