---
source: scripts/audit/design-manual/scripts/manifest.ts
sha256: 0cacbda1a97d4228dcd2bc97b486a645e51c4c92ab1395a44924bf184d20fdfa
signature: f5780298afb14e8435d6cd5843cb1248384331e9d13489e3177fd35528afe9e5
generated_at: 2026-11-10T02:22:37.228103+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/manifest.ts

## Purpose

Defines the type schema and a single merge utility for a design-capture manifest — the JSON artifact that records what was screenshotted, from which git commit, at which viewport sizes, and with what page geometry. It exists so that the capture writer, the batch planner, and the citation checker all agree on the same shape of data without duplicating type definitions.

## Key elements

- **`CAPTURE_DIR`** — Repo-relative path (`reports/audit/design-manual/capture`) where capture output (tiles, `manifest.json`, `batches.json`) is written. Gitignored.
- **`REPORT_DIR`** — Repo-relative path (`reports/audit/design-manual`) for review findings and the final report.
- **`InputFact`** — Shape of a form-control fact (label, `type`, `inputmode`, `autocomplete`, `enterkeyhint`).
- **`PageGeometry`** — Stitched-page measurements: height, scroll/client width, band offsets, sticky-repeat flag.
- **`DesignTile`** — One readable PNG slice of a stitched page: path, dimensions, `offsetY`, and a token estimate (`w×h/750`).
- **`DesignShot`** — One screen in one state at one size/theme. Carries id, module, spec, route, role, viewport, size, touch, theme, locale, state, tiles, page geometry, fixed elements, inputs, and headings.
- **`DesignCaptureManifest`** — Top-level run record: schema `version: 1`, `gitHead`, dirty-file list, timestamp, scope, viewport table, chrome sources, and the ordered `shots` array.
- **`mergeManifests(parts)`** — Combines the per-spec manifest parts into one run manifest. Header fields come from the first part; viewports and `chromeSources` are unions; shots keep run order. Throws `RangeError` on empty input or duplicate shot ids.

## Relationships

- **`scripts/e2e/viewports.ts`** — Imports `ViewportName` (type-only) to type the viewport fields in `DesignShot` and the `viewports` map in `DesignCaptureManifest`.
- **`scripts/audit/design-manual/scripts/capture.ts`** — The capture pipeline that writes manifest parts; consumes these types to shape the JSON it serialises.
- **`scripts/audit/design-manual/scripts/capture-task.ts`** — Cypress Node task that invokes the capture; the types here define what it persists.
- **`scripts/audit/design-manual/scripts/plan-batches.ts`** — The batch planner reads `DesignCaptureManifest` and its `DesignShot`/`DesignTile` types to group shots into model-context-sized batches.
- **`scripts/audit/design-manual/scripts/check.ts`** — The citation checker reads the manifest to verify shots against source claims.
- **`scripts/audit/design-manual/scripts/plan.ts`** — Higher-level planning that consumes the merged manifest.
- **`tests/support/e2e/design-capture.ts`** — E2E test helper that produces or validates capture data against these types.
- **`tests/unit/scripts/audit/design-manifest.spec.ts`** — Unit tests for `mergeManifests` and the type contracts.
- **`tests/unit/scripts/audit/capture-task.spec.ts`** — Unit tests for the capture task; exercises the manifest shapes this file defines.
- **`tests/unit/scripts/audit/plan-batches.spec.ts`** — Unit tests for the batch planner; validates against the `DesignCaptureManifest` and `DesignShot` types exported here.

## Notes

- `version` is a literal type `1`, not a number. Bump it whenever a field's *meaning* changes (not just when a field is added), so readers can reject incompatible manifests.
- `mergeManifests` throws `RangeError` (not a generic `Error`) on both the empty-input and duplicate-id cases. Callers that want to catch only merge failures can key off that type.
- The token estimate formula (`width × height / 750`) is Anthropic's own heuristic, baked into `DesignTile.estimatedTokens`. It is a planning input, not a precise count.
- `DesignShot.id` is a slug: `<module>--<case>--<viewport>--<theme>[--<locale>]`. The duplicate-id check in `mergeManifests` exists because a slug collision would silently overwrite a shot in the merged array.
- The file is explicitly a pure-types-plus-one-function module (per its `@module` doc comment). It has no runtime side effects beyond the two path constants.
