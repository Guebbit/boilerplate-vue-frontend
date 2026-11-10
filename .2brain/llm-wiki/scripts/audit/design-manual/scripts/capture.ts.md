---
source: scripts/audit/design-manual/scripts/capture.ts
sha256: e9e2566d3d154149ab5086033e33369e67c9a5451dbb14d7ca319dfd026fe3ba
signature: 00db80cd86a7051adc0f704d48794496e196f5879698707b4313278506e67bf6
generated_at: 2026-11-10T02:21:28.275304+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/capture.ts

## Purpose
CLI entry point (`npm run audit:design:capture -- [scope]`) that photographs the running app for design review. It resolves a scope (everything, `shell`, a module, a path, or `--diff`) to concrete e2e spec files, runs those specs in capture mode under the serial e2e runner, then merges the resulting shot rows into a single `manifest.json`. Each invocation replaces the previous capture entirely.

## Key elements
- **`CHROME_SOURCES`** – List of shared-chrome files (layout, nav, Vuetify setup, global CSS). If any is dirty, the scope widens to every screen.
- **`sweptModules()`** – Discovers which `src/modules/*` directories contain an `a11y.cy.ts` spec, giving the set of capturable modules.
- **`changedFiles()`** – Returns working-tree modified paths from `git status --porcelain` (used for `--diff` scope and the manifest's `dirty` field).
- **`runCapture(specs)`** – Spawns `npm run test:e2e:serial` with `E2E_DESIGN_CAPTURE=true`, `E2E_SPEC`, and `--hide-scrollbars` env; resolves/rejects on exit code.
- **`readParts()`** – Reads all `.jsonl` part files under `CAPTURE_DIR/parts/` and parses them into `DesignShot[][]`.
- **`viewportsOf(shots)`** – Derives the distinct viewport dimensions (width/height/touch) referenced by a shot set.
- **`scopeToSpecs()`** (imported) – Translates the raw CLI scope string into spec paths; returns a `widened` flag when chrome invalidation forces full coverage.
- **Main flow** – Resolves scope → wipes & recreates `CAPTURE_DIR` → runs capture → merges part files via `mergeManifests` → writes `manifest.json` → prints a summary line.

## Relationships
- **`scripts/audit/design-manual/scripts/capture-scope.ts`** – Supplies `scopeToSpecs`, which converts the user's scope argument (module name, path, `shell`, `--diff`) into an explicit list of spec file paths and signals whether the scope was widened.
- **`scripts/audit/design-manual/scripts/manifest.ts`** – Provides `CAPTURE_DIR` (the output directory), `mergeManifests` (combines per-spec part files into one manifest), and the `DesignCaptureManifest` / `DesignShot` types that shape the JSON output.
- **`scripts/e2e/viewports.ts`** – Exports the `VIEWPORTS` map and `ViewportName` type, used to resolve the pixel dimensions and touch flag for each viewport referenced in shots.

## Notes
- **Mutually exclusive with Stryker** – The capture takes the same `flock /tmp/claude-e2e.lock` as any other e2e run; it must not run concurrently with mutation testing.
- **Destructive on every run** – `CAPTURE_DIR` is `rmSync`'d before the run starts; there is no incremental capture.
- **Scrollbars hidden** – `ELECTRON_EXTRA_LAUNCH_ARGS: '--hide-scrollbars'` is passed so the layout engine treats the viewport as full-width (phone-like), matching the visual regression suite.
- **`git()` vs. `changedFiles()`** – The generic `git()` helper trims output; `changedFiles()` calls `execFileSync` directly to preserve the two-character status prefix that `trim()` would strip.
- **Part files are JSONL** – Each spec writes one JSON object per line into `CAPTURE_DIR/parts/<spec>.jsonl`; the merge step concatenates all parts.
