---
source: scripts/mutation/overlay.ts
sha256: b6894850d42fea33ab2f1d5c4212127fdaec3e1ac08152a420bfe8d575215263
signature: df9f8487ba58d9d11889019e1129bdc02367046cef4be160367f3702ee04d729
generated_at: 2026-11-10T02:45:36.043718+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/overlay.ts

## Purpose

Overlays a partial Stryker mutation run (e.g. `npm run test:mutation -- --mutate <file>`) onto the whole report already on disk, so `reports/mutation/` accumulates one report covering every file. Renumbers test and mutant IDs to resolve collisions between separately-generated reports, and renders the Stryker HTML viewer with the merged report inlined.

## Key elements

- **`StrykerReport`** (exported interface) — the subset of Stryker's `mutation-testing-report-schema` this file reads and writes: a `files` map with `mutants[]` per file, and an optional `testFiles` map with `tests[]` per test file.
- **`ReportMutant` / `ReportTest`** (internal interfaces) — typed views of a single mutant or test entry; unknown fields pass through via index signatures.
- **`mergeTests`** (internal) — deduplicates tests across N reports by `file|name|startLine`, assigns a single sequential ID to each canonical test, and returns a per-report old-ID → new-ID map. First report to name a test wins.
- **`overlayReport(whole, partial)`** (exported) — merges `partial` over `whole`: files present in `partial` take their mutants; files only in `whole` are kept. All mutant IDs are renumbered 0, 1, 2… in a single sequence, and `coveredBy` / `killedBy` arrays are remapped through the merged test ID maps.
- **`renderHtml(template, report)`** (exported) — finds the `app.report = …` line in Stryker's generated `index.html`, replaces it with the serialised report (with `<` escaped as `'<'+` to stay inside `<script>`), and returns the modified page. Throws if the line is missing.

## Relationships

- **`scripts/mutation/run-tests.ts`** — the runner that executes a partial Stryker invocation; consumes `overlayReport` to fold the new run into the on-disk report and `renderHtml` to produce the viewer page.
- **`tests/unit/scripts/mutation/overlay.spec.ts`** — unit tests exercising `overlayReport`, the ID-remapping logic, and `renderHtml`.
- **`tests/cross-cutting/module-map.spec.ts`** — verifies the public export surface (`StrykerReport`, `overlayReport`, `renderHtml`) matches the documented API.

## Notes

- Mutant IDs are **globally sequential** (0, 1, 2, …) across all files, not per-file. Anything that assumes per-file or stable IDs will break after an overlay.
- In `overlayReport`, the partial report is passed **first** to `mergeTests`, so when both reports contain the same test, the partial's entry is the one that survives.
- `renderHtml` is brittle by design: it does a line-level string swap and will throw on a Stryker upgrade that changes the HTML layout. The error message is the intended signal to update the pattern.
- The file's header comment notes that `scripts/mutation/ci/merge.ts` implements a sibling overlay for the CI sweep merge.
