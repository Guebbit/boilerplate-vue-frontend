---
source: scripts/audit/design-manual/scripts/capture-task.ts
sha256: 4cd5e2505b90346dce9eb3b25bb2a62a65ec2431a33fbcb6df13f217ad1226a5
signature: 8619f5895ee23d2df44133d010510cd959c740c627a5f1a539a39bd3a573e59e
generated_at: 2026-11-10T02:21:06.094144+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/capture-task.ts

## Purpose

Implements the two Node-side `cy.task` handlers that complete the `cy.captureDesign()` workflow: stitching multiple viewport screenshots into model-sized tiles and persisting shot metadata to per-spec JSONL manifest files. It exists because the Cypress browser context cannot read the screenshots it wrote or produce the output tiles and manifest rows on disk.

## Key elements

- **`StitchSegmentRequest`** — input shape for one viewport shot (PNG path + `scrollY`).
- **`StitchRequest`** — full stitch payload: `shotId`, ordered `segments`, `bandTop`/`bandBottom` chrome row counts, and total `pageHeight`.
- **`estimatedTokensOf(width, height)`** — Anthropic's image-token heuristic: `⌈width × height / 750⌉`.
- **`stitchDesignCapture(request, root?)`** — reads each segment PNG, calls `stitchSegments` to build one tall page, slices it via `cutTiles`/`tileHeightFor`, writes `tile-N.png` files under `CAPTURE_DIR/<shotId>/`, and returns the `DesignTile[]` array (paths relative to `root`).
- **`RecordShotRequest`** — the spec slug plus a single `DesignShot` row to persist.
- **`recordDesignShot(request, root?)`** — appends the shot to `parts/<spec>.jsonl`, replacing any existing row with the same `id` (handles retried tests). Returns the written file path so the task can pass a serialisable value back to the browser.

## Relationships

- **`cypress.config.ts`** — registers `stitchDesignCapture` and `recordDesignShot` as `cy.task` handlers.
- **`scripts/audit/design-manual/scripts/manifest.ts`** — supplies `CAPTURE_DIR`, and the `DesignShot` / `DesignTile` types used as the contract for both handlers.
- **`scripts/audit/design-manual/scripts/stitch.ts`** — provides the low-level `cutTiles`, `stitchSegments`, and `tileHeightFor` functions that `stitchDesignCapture` delegates to.
- **`tests/support/e2e/design-capture.ts`** — the browser-side orchestrator that calls the stitch and record tasks.
- **`tests/unit/scripts/audit/capture-task.spec.ts`** — unit tests exercising both exported functions in isolation.

## Notes

- `root` defaults to `process.cwd()` but is injected as a parameter so tests can point at a temp directory without touching the real `reports/` tree.
- The "replace by id" logic in `recordDesignShot` reads the entire JSONL, filters out the matching row, then rewrites the file — intentional for a single-writer-per-spec model (no file locking).
- Tile filenames are 1-indexed (`tile-1.png`, `tile-2.png`, …) matching the top-to-bottom tile order returned.
- `estimatedTokensOf` is a static heuristic (Anthropic's documented formula), not a runtime measurement; it is embedded in each `DesignTile` so downstream consumers can budget context without re-reading the PNGs.
