---
source: scripts/e2e/shot-size.ts
sha256: c9dd30d220e2bf0f8c23b259b0249e55bea274f3027212e6a4ee48619a310e15
signature: 0bc6955d80eee3c459d1934913aaf75af45f12621c01e8f71dc0016f965a6781
generated_at: 2026-11-10T02:36:25.973721+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/shot-size.ts

## Purpose

A guard function that detects when a captured screenshot's pixel dimensions do not match the page's declared viewport, preventing mismatched images from being recorded or compared against baselines. It distinguishes between a DPR-2 capture and a clipped browser window, producing a human-readable diagnostic string in either failure case.

## Key elements

- **`ShotSize`** (interface) — A `{ width, height }` pair representing a pixel size.
- **`shotSizeProblem`** (exported const/function) — Compares an actual screenshot size against the expected viewport size. Returns `undefined` when they match, or a descriptive error string when they differ (DPR-2 case or window-too-small case).

## Relationships

- **tests/support/e2e/design-capture.ts** — Calls `shotSizeProblem` before performing baseline comparison or update, treating the returned string as a fatal guard that blocks both record and assert paths.
- **tests/support/e2e/visual-task.ts** — Integrates the same guard into its visual-regression task flow so no clamped shot reaches the baseline store.
- **tests/unit/scripts/e2e/shot-size.spec.ts** — Unit-tests the matching, DPR-2, and window-too-small branches of `shotSizeProblem`.

## Notes

- The function is intentionally side-effect free: it only *reports* the problem; the caller decides whether to abort, log, or fail.
- The "exactly 2×" check is a heuristic for DPR 2. A DPR of 1.5 or 3 would fall into the generic "window is smaller" branch and produce a misleading message.
- The error string for the window-too-small case references `scripts/e2e/browser-launch.ts` as the place to fix the viewport, coupling the diagnostic message to another file by convention rather than import.
