---
source: scripts/audit/design-manual/scripts/plan.ts
sha256: d878dff1f77406a2c5c3b59e9f61129b10af438603465f59f7339a535c31d547
signature: fdccb4ac60d72f39c5db5056bc408333af7a3ec40c69e83820530afc4569892e
generated_at: 2026-11-10T02:23:25.404885+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/plan.ts

## Purpose

CLI entry-point (run via `tsx`) that turns the last design capture's manifest into a concrete set of review batches. It reads `manifest.json`, optionally filters shots by a scope argument, delegates the batching decision to `plan-batches`, writes `batches.json` alongside the manifest, and prints a one-line summary per batch. Existing as a thin orchestration layer keeps the pure batching logic testable and the capture contract explicit.

## Key elements

- **Scope argument** – read from `process.argv[2]`; empty string means "all shots".
- **Manifest gate** – exits 1 with a stderr message if `manifest.json` is missing in `CAPTURE_DIR`.
- **Shot filter** – keeps a shot when `scope` is empty, `shot.module === scope`, or `shot.spec.includes(scope)`.
- **Batching call** – passes the filtered shots to `planBatches`; inspects the optional `problem` field for early exit.
- **Output** – writes `batches.json` (pretty-printed, trailing newline) to `CAPTURE_DIR` and prints one stdout line per batch (`name`, shot count, tile count, estimated tokens).

## Relationships

- **`manifest.ts`** – provides the `CAPTURE_DIR` path constant and the `DesignCaptureManifest` type used to parse the JSON file. This script is the consumer of the manifest that the capture step (defined in that module) writes.
- **`plan-batches.ts`** – supplies `planBatches`, the pure function that groups filtered shots into batches. This script is its only caller; it handles I/O and exit codes, while `plan-batches` returns either `{ batches }` or `{ problem }`.

## Notes

- The script deliberately exits 1 when zero batches are planned so an empty capture cannot masquerade as a clean review in CI.
- Scope matching is intentionally loose: a substring match on the spec path means partial module names (e.g. `auth`) will match multiple specs. There is no exact-path-only mode.
- `mkdirSync(CAPTURE_DIR, { recursive: true })` is called before writing `batches.json`; the directory is assumed to already exist (created during capture) but the call is defensive.
