---
source: scripts/audit/css-invasive/report.ts
sha256: e519f0f22597fc6c84f0f42ac4052372ed43909b211c4f0fbc386ac9a4192c2c
signature: 87b4c934938015ded26709882757bfe28804217382dcbc882f1e2d745dc5318c
generated_at: 2026-11-10T02:19:22.997073+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/css-invasive/report.ts

## Purpose

CLI entry point (`npm run audit:css`) that runs an invasive-CSS scan and prints the findings either as a human-readable report or as a single JSON document (`--json`). It is a pure reporting layer: it performs no scanning logic itself and always exits 0 when the scan completes, regardless of hit count.

## Key elements

- **`flags`** – A `Set` of CLI arguments parsed from `process.argv.slice(2)`; currently only `--json` is recognised.
- **`countsByCheck(findings)`** – Returns a `Record<CheckId, number>` with every known check zero-initialised, then tallied from the findings.
- **`humanHit(finding)`** – Formats one finding as a three-line block: `file:line [check] anchor`, indented snippet, indented fix suggestion.
- **`print(findings)`** – Dispatches on `flags`: writes a pretty-printed JSON object (`{ total, counts, hits }`) for `--json`, otherwise prints each hit via `humanHit` followed by a per-check summary table (only non-zero rows plus a total line).
- **Top-level invocation** – Calls `scanApp()`, pipes results to `print`, and on rejection writes the stack to stderr and exits **2**.

## Relationships

- **`scripts/audit/css-invasive/scan.ts`** — Source of `CHECKS`, `scanApp`, and the `CheckId` / `CssFinding` types that this file consumes. All scan logic lives there; this file only formats and prints.
- **`tests/unit/scripts/e2e/layout-findings.spec.ts`** — E2E spec that exercises this script's output (both human and JSON modes) against expected finding shapes.

## Notes

- Exit code **0** means "scan completed" even with hundreds of hits; the actual CI gate is `tests/cross-cutting/css-invasiveness.spec.ts`, not this script.
- Exit code **2** signals a runtime failure (e.g. filesystem error inside `scanApp`).
- The `--json` output is a single JSON document on stdout (no logging noise), designed to be parsed by an agent planning fixes.
- The `#!/usr/bin/env tsx` shebang allows direct execution without a separate runner.
