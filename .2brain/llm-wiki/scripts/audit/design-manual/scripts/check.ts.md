---
source: scripts/audit/design-manual/scripts/check.ts
sha256: 69715d486c92a8cc5a7fe43fc69651c7342de69c19f0b07daaccc741d3a7476e
signature: 1fe66be3d3452f8a1ff9a504ac398d0ca177937025a0981198f6812019eb90ec
generated_at: 2026-11-10T02:22:10.625634+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/check.ts

## Purpose

CLI entry point (`npm run audit:design:check -- <SCOPE>`) that validates the citations in a design-review report. It reads the scope's report Markdown and the capture's `manifest.json`, delegates row-level checking to `checkReport`, prints any unresolvable tile or `file:line` references, and exits non-zero so the calling skill can drop bad rows.

## Key elements

- **Scope argument** (`process.argv[2]`) — selects which `<SCOPE>.verified.md` / `<SCOPE>.findings.md` file to audit; missing arg exits 2.
- **Report file resolution** — prefers `<SCOPE>.verified.md`; falls back to `<SCOPE>.findings.md` when the verifier has not yet run.
- **`checkReport` call** (imported from `./check-report`) — receives the raw Markdown text plus two callbacks:
  - `manifestTiles`: a `Set` of tile paths flattened from the manifest's shots.
  - `fileExists` / `lineCount`: small `node:fs` helpers so the checker can validate `file:line` references without re-implementing I/O.
- **Output** — one `stdout` line per failure (`row · column: reason`), followed by a summary line; exit code **1** if any failures, **0** if clean, **2** on missing inputs.

## Relationships

- **`./check-report.ts`** — provides `checkReport`, the actual per-row validation logic (tile existence in the manifest, file presence, line-range validity). This file supplies it with the Markdown text, the tile-path set, and the `fileExists` / `lineCount` callbacks.
- **`./manifest.ts`** — supplies the `CAPTURE_DIR` and `REPORT_DIR` path constants and the `DesignCaptureManifest` type. This file uses those constants to locate the report and the `manifest.json` data file, and the type to parse the JSON before extracting `shots[].tiles[].path` into the tile set passed to `checkReport`.

## Notes

- Exit-code contract is three-valued: 0 = pass, 1 = citation failures, 2 = usage or missing-file error. Callers (the skill) must distinguish 1 from 2.
- `lineCount` reads the entire file into memory just to count lines; fine for small source files but not a streaming solution.
- The script assumes the capture manifest lives at a fixed path (`CAPTURE_DIR/manifest.json`) regardless of scope — there is one manifest per capture, not per scope.
- Run via `tsx` (shebang `#!/usr/bin/env tsx`), so no build step is required.
