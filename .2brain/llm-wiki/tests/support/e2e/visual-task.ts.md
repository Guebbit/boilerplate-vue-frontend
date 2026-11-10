---
source: tests/support/e2e/visual-task.ts
sha256: d88c1020663871cd339e060363b91ac99bbf61f36dd8438466c30f356797f99c
signature: 1793657b6491f24b664eb90d2c3fe1b54598226e637ec5e5df0c312b7f6c5671
generated_at: 2026-11-10T07:37:57.239328+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/visual-task.ts

## Purpose

Cypress Node task that performs pixel-level image comparison behind the visual snapshot command. It runs in the Node process (not the browser) so it can read committed baseline PNGs from the filesystem, compare them against a freshly captured screenshot using `pixelmatch`, and produce a diff image on failure. It is hand-rolled rather than plugin-based so the tolerance values and missing-baseline behaviour are explicit and editable.

## Key elements

- **`PIXEL_THRESHOLD`** (0.15) – per-pixel colour tolerance passed to `pixelmatch`; absorbs antialiasing / sub-pixel font differences.
- **`MAX_DIFFERING_RATIO`** (0.002) – maximum fraction of pixels allowed to differ before the test fails.
- **`CompareOptions`** – input interface: snapshot name, actual screenshot path, spec-relative path, expected viewport `ShotSize`, diff directory, and an `update` flag.
- **`CompareResult`** – output interface: `passed` boolean and a human-readable `message`.
- **`compareSnapshot(options)`** – the single exported function. Checks viewport size → handles update mode → checks baseline existence → compares dimensions → runs `pixelmatch` → returns result and writes a `.diff.png` (or `.new.png`) when needed.

## Relationships

- **`cypress.config.ts`** – registers `compareSnapshot` as a Cypress Node task; this file is the server-side implementation that the browser-side test commands invoke through that registration.
- **`scripts/e2e/shot-size.ts`** – provides `shotSizeProblem()` and the `ShotSize` type, used to validate that the screenshot matches the page's `innerWidth` × `innerHeight` before any baseline logic runs.

## Notes

- A missing baseline **fails** the test and writes the shot to `<diffDirectory>/<name>.new.png`; it does **not** auto-create a baseline. Baselines are only written in update mode (`npm run test:e2e:visual:update`).
- The viewport-size check (`shotSizeProblem`) runs **before** update mode, so a clamped/double-density screenshot can never be recorded as a baseline.
- Baselines live in a `__snapshots__` folder beside the owning spec file (resolved via `path.dirname(specRelative)`), so deleting a module or shell directory removes its baselines.
- Path resolution assumes `process.cwd()` is the repo root — the same assumption `scripts/testing/report-results.ts` makes; it holds for anything launched via `npm run`.
- Both thresholds are deliberately loose. The file's header warns that a visual test failing on noise gets baselines re-approved without review, which is "worse than not existing."
