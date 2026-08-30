# docs/reference/scripts.md

## Purpose

Reference page for every file under `scripts/` and `.husky/`. It complements the [Package Scripts](../tools/package-scripts.md) page (which covers *when* to run things) by explaining *what each file is*, the repo's script naming conventions, and which scripts are cross-repo mirrors that must stay in lockstep.

## Key elements

- **Naming-convention table** — maps verb prefixes (`check-`, `build-`, `generate-`, `run-`, `report-`, `export-`, `sync-`, no-verb) to the kind of work each script does; no-verb files are libraries, never CLI entries.
- **Cross-repo pairing table** — lists scripts that are byte-identical mirrors of the backend's (`cypress-spec-globs.ts`, `paired-backend-path.ts`, `spec-identity.ts`, `check-spec-identity.ts`, `generate-asyncapi-types.ts`) and links to their companion docs.
- **Running the real backend** — `run-backend-demo.ts` (boots the sibling backend's demo profile) and `run-e2e-shards.ts` (parallel Cypress shards).
- **Mutation testing** — `run-mutation-tests.ts`, `mutation-baseline.ts` (per-file ratchet), `check-mutation-baseline.ts` (compare / `--update`).
- **Diagnostics** — `report-test-results.ts` (maps runner JSON to module-level summaries).
- **Git hooks** — `.husky/pre-commit` (local gate), `.husky/commit-msg` (commitlint), `.husky/.gitignore`.

## Relationships

- **`scripts/cypress-spec-globs.ts`** — This page is the primary documentation for that file. It is the single source of truth for Cypress spec globs, read by `cypress.config.ts`, `eslint.config.ts`, and the shard runner. Because `package.json` cannot import TypeScript, a spec asserts the five `--spec` arguments resolve to the same set.

## Notes

- Several scripts are **byte-identical mirrors** of the backend's copy. The page explicitly warns: change one, copy to the other, or the two repos drift. A plain `diff` is the intended comparison method.
- Abbreviations in filenames are a lint error (`unicorn/prevent-abbreviations`); write `directory`, not `dir`.
- `check-spec-identity.ts` **degrades to a warning** when the sibling repo is absent locally, but is **fatal under `CI`** where a missing sibling signals a misconfigured workflow.
- The same verb-prefix vocabulary is shared with `boilerplate-node-backend` and `boilerplate-php-laravel-backend` (StudlyCase Artisan commands), so the naming table applies across the boilerplate family.
