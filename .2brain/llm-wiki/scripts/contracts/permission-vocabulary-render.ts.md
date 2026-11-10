---
source: scripts/contracts/permission-vocabulary-render.ts
sha256: bbfbb21b07976de0ac8925ca20acca4cbf8963eb85a8e2ae732eb0d8639a4482
signature: 9550b8b46ced5c0582fa3c0345c32dc32fdfff31fa5c51ac935a33519bc3bf34
generated_at: 2026-11-10T02:26:19.207155+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/permission-vocabulary-render.ts

## Purpose

Pure (no-filesystem) half of the permission-vocabulary code generator. It parses the closed lists declared in the shared `authorization-keys` YAML document, validates them, and renders the TypeScript source (`as const` arrays, union types, and a subject→actions pair map) that downstream code imports to reference permission keys without free-form strings.

## Key elements

- **`PermissionVocabulary`** (interface) — the typed shape of every closed list extracted from the YAML: `actions`, `subjects`, `ruleIds`, `setNames`, `scopes`, `stepUpTiers`, and `pairs` (subject → actions map).
- **`readPermissionVocabulary(yamlText)`** — parses YAML text, validates that every required list is present, non-empty, unique, and that each rule references only declared actions/scopes/step-up tiers. Returns a `PermissionVocabulary`.
- **`renderPermissionVocabulary(vocabulary)`** — turns a `PermissionVocabulary` into the full text of the generated TypeScript module (header comment, six `as const` arrays + their `number`-indexed union types, and the `PERMISSION_PAIRS` const + `ActionOn<S>` mapped type).
- **Internal validators** — `stringList`, `mappingKeys`, `fieldOfEach`, `assertUnique`: small helpers that throw descriptive `Error`s naming the offending key and value.
- **`renderList`** (private) — emits one `export const … = […] as const` block and its companion `export type … = (typeof …)[number]` pair.

## Relationships

- **`scripts/contracts/generate-permission-vocabulary.ts`** — the "other half" (filesystem side). It reads the YAML file from disk, calls `readPermissionVocabulary` + `renderPermissionVocabulary`, and writes the output. This file deliberately contains no I/O so the logic can be unit-tested in isolation.
- **`tests/unit/scripts/contracts/permission-vocabulary-render.spec.ts`** — unit tests that feed YAML strings into `readPermissionVocabulary` and assert the rendered output, exercising validation paths and happy-path rendering without touching the filesystem.

## Notes

- **Shared by hand across a paired repo set.** The file is kept byte-identical in both repos manually; it is *not* listed in `SHARED_FILES` by design (see `docs/tools/pairing-and-ports.md`, "Convenience is not necessity"). Edits must be replicated in both repos.
- **Ordering matters.** `subjects` is deduplicated in first-seen order from rules; `ruleIds` and `pairs` preserve declared order. Downstream code should not sort or rely on alphabetical order.
- **Validation is fail-fast.** The first missing/empty/duplicate/undeclared value throws; there is no "collect all errors" mode.
- **Generated output header** hard-codes the command `npm run gen:api` and the source filename `shared/authorization-keys.generated.yaml` as a string literal — if the pipeline script name or path changes, this file must be updated in lockstep.
