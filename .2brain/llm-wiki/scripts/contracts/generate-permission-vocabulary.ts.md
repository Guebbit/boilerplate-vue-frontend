---
source: scripts/contracts/generate-permission-vocabulary.ts
sha256: 2990e4ceef86b8e97d16f7eb430e68a7e01c0c871676715a90b49258d401079a
signature: f429cbd5fe8d154c65f72aad8de29512d6ac87aab45906d09f92fa050eebe428
generated_at: 2026-11-10T02:24:59.835756+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/generate-permission-vocabulary.ts

## Purpose

CLI generator that reads an authorization-keys YAML document and emits a TypeScript `permission-vocabulary` module containing runtime arrays and union types for actions, subjects, rule IDs, set names, scopes, step-up tiers, and the subject-to-actions pair map. It exists so the permission vocabulary is derived from a single YAML source rather than hand-maintained in each repo.

## Key elements

- **`requiredPath(flag)`** — Parses a required `--flag <value>` pair from `process.argv`, resolves it to an absolute path under the repo root, and exits with an error message if the flag or its value is missing.
- **`INPUT` / `OUTPUT`** — Module-level constants holding the resolved `--in` (YAML) and `--out` (generated `.ts`) paths.
- **`output`** (const) — The full generated file text, produced by piping `readPermissionVocabulary(readFileSync(INPUT))` through `renderPermissionVocabulary`.
- **`writeOrCheck(OUTPUT, output, INPUT)`** — Final call that either writes the file or, under `--check`, compares against the on-disk version and exits 1 on mismatch.
- **`ROOT`** — Repo root derived from `import.meta.url` (ESM context); used as the base for resolving CLI path arguments.

## Relationships

- **`scripts/contracts/permission-vocabulary-render.ts`** — Supplies the two functions this script orchestrates: `readPermissionVocabulary` (YAML → intermediate structure) and `renderPermissionVocabulary` (structure → TypeScript source text). The render module is duplicated by hand in the frontend repo and is not auto-synced.
- **`scripts/contracts/generated-file.ts`** — Provides the `writeOrCheck` helper that implements the write-or-verify contract shared by all generators in this directory.
- **`contracts/permission-vocabulary.ts`** — The artifact this script produces (the `--out` target in the backend repo).
- **`github/workflows/ci.yml`** — Invokes this script (typically with `--check`) to fail the build if the checked-in generated file is stale relative to the YAML source.

## Notes

- The script is ESM (`#!/usr/bin/env tsx`, `import.meta.url`); `__dirname` is unavailable.
- The render module is intentionally **not** shared via a package or sync script — both repos keep an identical copy by hand. Keep them in lockstep when editing.
- The input YAML is the same *logical* document in both repos but lives at different paths: backend uses `shared/authorization-keys.generated.yaml`; frontend uses `contracts/authorization-keys.yaml` (populated by a `sync:frontend` step).
- `--check` mode performs no writes; a mismatch sets the process exit code to 1. This is the same contract every generator under `scripts/contracts/` follows.
