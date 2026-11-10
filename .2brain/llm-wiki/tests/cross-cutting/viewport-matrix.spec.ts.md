---
source: tests/cross-cutting/viewport-matrix.spec.ts
sha256: 0fcf7236122d0061e225db0f3d962ba99f4031566fce067b5015d46fc79895c1
signature: 0e2b62a97a40a44e4316475994183b6172f7c8ccbcb8a9d1c524d8c3f875576b
generated_at: 2026-11-10T06:42:20.572285+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/viewport-matrix.spec.ts

## Purpose

A cross-cutting guard that enforces viewport sizes live in exactly one module (`scripts/e2e/viewports.ts`) and are applied through exactly one seam (`tests/support/e2e/apply-viewport.ts`). It also validates the `<meta name="viewport">` tag in `index.html` for accessibility (zoom allowed, scale ≥ 1). The goal is to prevent a "size typed twice" drift where a spec and the matrix disagree on a width, hiding a layout bug.

## Key elements

- **`SCANNED`** — list of ~100+ repo-relative `.ts` paths under `tests/e2e`, `tests/support/e2e`, `tests/support/lighthouse`, `scripts/e2e`, `scripts/lighthouse`, module-level e2e tests, and `cypress.config.ts`. Excludes `node_modules`, the matrix file itself, and this spec.
- **`SIZE_LITERAL`** — regex matching `width: 390` / `viewportHeight: 800` style inline size assignments.
- **`SIZE_PAIR`** — regex matching device-named array pairs like `const PHONE = [390, 844]`, guarded by a keyword to avoid false positives on status codes.
- **`filesMatching(pattern)`** — reads each file in `SCANNED` and returns those whose text matches the given regex.
- **`describe('the viewport matrix')`** — four assertions: scan is non-vacuous (>100 files), no other file types a size, `cy.viewport(` appears only in the seam file, and `REPORT_VIEWPORTS` keys are disjoint from `VIEWPORTS` keys.
- **`describe('the meta viewport (index.html)')`** — asserts `width=device-width`, `initial-scale=1`, no `user-scalable=no/0`, and `maximum-scale` ≥ 5 (axe `meta-viewport-large` floor).

## Relationships

- **`scripts/e2e/viewports.ts`** — The sole import target. This spec imports `REPORT_VIEWPORTS` and `VIEWPORTS` to verify their key sets are disjoint. It also treats that file as the *only* place a size may be typed, so any new size constant must be added there and referenced by name everywhere else.

## Notes

- The spec excludes itself from the scan (`THIS_FILE`) and the matrix file (`MATRIX_FILE`) from `SCANNED`; both contain size literals by design.
- Unit-test directories are intentionally out of scope: a size there is fixture data, not a device layout target.
- The `SIZE_PAIR` regex requires a device-related keyword on the line to avoid flagging unrelated numeric arrays (e.g., HTTP status codes).
- The meta-viewport zoom check encodes the WCAG 1.4.4 200 % text requirement via the `maximum-scale ≥ 5` threshold.
