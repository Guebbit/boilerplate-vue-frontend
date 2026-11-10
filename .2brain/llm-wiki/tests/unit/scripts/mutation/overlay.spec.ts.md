---
source: tests/unit/scripts/mutation/overlay.spec.ts
sha256: d97f80b6e141f83111365f914061fd00a8400c0a2803ca68d24252264536493e
signature: aaf77ff667d94ab4a830a8b1b52ef2fa52a5b7029c886c87e9c22e0aff03a1d6
generated_at: 2026-11-10T08:22:16.926179+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/mutation/overlay.spec.ts

## Purpose

Vitest spec for `scripts/mutation/overlay.ts`. It verifies that `overlayReport` correctly merges a partial mutation run over a full report on disk (preserving per-file mutants, disambiguating test ids, and guaranteeing unique mutant ids) and that `renderHtml` splices a report JSON into a Stryker viewer page with the expected escaping.

## Key elements

- **`mutant(id, status, coveredBy?)`** – builds a single mutant object shaped like a Stryker report entry (fixed `mutatorName`, fixed location).
- **`reportOf(files, tests?)`** – assembles a minimal `StrykerReport` with the given file/mutant pairs and an optional list of tests under one constant test file.
- **`mutantsOf(merged, file)`** – shortcut to `merged.files[file].mutants` for readable assertions.
- **`testName(merged, id)`** – looks up a test name by id within the merged report's single test file.
- **`describe('overlayReport')`** – three tests:
  - Partial-run files replace whole-report files; untouched files are carried through.
  - Mutants in each file keep pointing at their *own* report's test even when both reports reuse the same numeric test id.
  - Mutant ids remain globally unique after the merge.
- **`describe('renderHtml')`** – two tests:
  - The report JSON replaces the placeholder, and `</script>` inside string values is escaped as `"<"+"/script>"` (matching Stryker's own convention).
  - A template that lacks the `app.report` anchor causes a thrown error mentioning `app.report`.

## Relationships

- **`scripts/mutation/overlay.ts`** – the module under test. This file imports `overlayReport`, `renderHtml`, and the `StrykerReport` type from it. All assertions exercise the public behavior of those two functions.

## Notes

- Fixtures are hand-built and intentionally minimal; they do not mirror a real Stryker output file (no `config`, no per-test `location` beyond a synthetic line number).
- The `renderHtml` escape assertion is coupled to Stryker's internal `</script>` workaround (`"<"+"/script>"`). If Stryker changes that convention, this test will fail even though the merge logic is correct.
- The `mutant` helper hard-codes `mutatorName: 'ConditionalExpression'` and a `1:1–1:9` location; no test asserts on those fields, so they are purely structural.
