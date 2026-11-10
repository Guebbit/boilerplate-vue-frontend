---
source: tests/unit/scripts/contracts/permission-vocabulary-render.spec.ts
sha256: 56a01e89ef0507715ae5d1144d89eb51a241c14e0634ef83f12fd018c47c7952
signature: df5e2350bdaf5694c2227bb74cf99d31605ad1089c2bc94170934812bb2bf742
generated_at: 2026-11-10T08:13:02.460316+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/contracts/permission-vocabulary-render.spec.ts

## Purpose

Unit tests for the `readPermissionVocabulary` / `renderPermissionVocabulary` contract pair. Verifies that the YAML reader enforces structural invariants (order preservation, no duplicates, referential integrity against declared lists) and that the renderer emits a deterministic set of TypeScript const arrays, union types, and a subject→actions pair map.

## Key elements

- **`DOCUMENT`** — Fixture object modelling a valid permission-vocabulary YAML document (actions, scopes, stepUp tiers, rules, named sets).
- **`mapping(key, value)`** — Tiny helper that renders a YAML *mapping* block (e.g. `scopes`, `stepUp`) where every entry's value is the literal `x`.
- **`yamlOf(overrides?)`** — Serialises `DOCUMENT` (merged with optional overrides) into the exact YAML string the reader expects. Handles two shapes: list blocks (`actions`, `rules`, `sets`) and mapping blocks (`scopes`, `stepUp`).
- **`describe('readPermissionVocabulary')`** — Asserts happy-path ordering (actions, subjects in first-seen order, ruleIds, setNames, scopes, stepUpTiers, pairs) and covers 11 refusal cases via `it.each` (empty/missing lists, duplicate actions/sets/rules, undeclared action/scope/stepUp, empty document, non-string list entry, rule missing `subject`).
- **`describe('renderPermissionVocabulary')`** — Asserts the renderer output contains correctly-formatted `export const …` / `export type …` pairs for all six categories, the `PERMISSION_PAIRS` map with the `ActionOn<S>` generic type, and that two consecutive read→render cycles produce byte-identical output.

## Relationships

- **`scripts/contracts/permission-vocabulary-render.ts`** — The system under test. This spec imports `readPermissionVocabulary` and `renderPermissionVocabulary` directly and exercises both in every test case.

## Notes

- The YAML is hand-built by `yamlOf` rather than produced by a YAML serialiser; this keeps the test independent of any YAML library and mirrors the exact subset the reader is expected to parse.
- `mapping` and the `block` closure inside `yamlOf` handle two different YAML shapes (key→scalar mapping vs. list of scalars/objects). If the reader's grammar changes, both helpers must be updated.
- Refusal tests mutate *one* field at a time via the `overrides` parameter, so each failure isolates a single invariant. The non-string and missing-subject cases instead do a targeted `String.replace` on the generated YAML, making them more fragile to YAML formatting changes in `yamlOf`.
- Render assertions use `toContain` with exact multi-line strings (4-space indent, specific semicolons), so they are sensitive to whitespace/formatting changes in the renderer output.
