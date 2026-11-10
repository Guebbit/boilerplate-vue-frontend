---
source: tests/unit/scripts/e2e/shot-size.spec.ts
sha256: d615b4612e568523bebbc4b815788a6e1bbd8c0275216d677fa0a65ec54929b4
signature: d615b4612e568523bebbc4b815788a6e1bbd8c0275216d677fa0a65ec54929b4
generated_at: 2026-11-10T08:18:12.483381+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/shot-size.spec.ts

## Purpose
Unit tests for the `shotSizeProblem` guard in the E2E screenshot pipeline. Ensures that a clamped or mismatched screenshot is never silently accepted as a visual baseline by verifying the diagnostic message returned for each failure mode.

## Key elements
- **`describe('shotSizeProblem')`** — Vitest suite covering three scenarios:
  - Exact-match case: a shot whose dimensions equal the viewport is asserted with `toBeUndefined()` (no problem detected).
  - "Window too small" case: a shot shorter than the viewport (390×720 vs 390×844) produces an error string that names the browser-window cause and points to `scripts/e2e/browser-launch.ts`.
  - Pixel-ratio case: a shot exactly 2× the viewport (780×1688) produces a message containing `"device pixel ratio is 2"`.
- **`shotSizeProblem`** (imported) — the function under test; signature is `(shot: {width, height}, viewport: {width, height}) => string | undefined`.

## Relationships
- **`scripts/e2e/shot-size.ts`** — the only imported module; this spec exercises its sole export `shotSizeProblem`.

## Notes
- The "window too small" assertion uses `toBe` (exact string match), so any wording change in `shotSizeProblem` breaks the test. The pixel-ratio case uses `toContain`, which is more forgiving.
- The viewport dimensions (390×844) mirror an iPhone 14-class screen; the tests are written around that specific ratio, not a generic parameterized matrix.
