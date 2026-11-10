---
source: scripts/e2e/cypress-spec-globs.ts
sha256: 41b3ab3e0809fc68d27a5a0c265d21c9005ac0bbd674c5778693ec269c7e658b
signature: 14ef0209c1eeefd252c78d7573ed1b6c2ff36450b5b7ac77f7739b4c90aba282
generated_at: 2026-11-10T02:31:39.808564+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/cypress-spec-globs.ts

## Purpose

Single source of truth for the glob patterns that define where Cypress spec files live. The pattern is needed in five places that cannot share an import (Cypress config, ESLint config, the shard runner, `package.json` scripts, and a test that cross-checks the last). Centralizing it here keeps those five in sync without a shared runtime dependency.

## Key elements

- **`FUNCTIONAL_SPEC_GLOBS`** – Globs for the default gate (`npm run test:e2e`). Covers cross-cutting specs in `tests/e2e/specs/` and per-module specs in `src/modules/*/tests/e2e/`. Excludes `.visual` and `.antibot` specs via glob negation.
- **`VISUAL_SPEC_GLOBS`** – Pixel-diff specs, run separately from the gate. Identified by the `.visual.cy.ts` suffix rather than a dedicated directory.
- **`ANTIBOT_SPEC_GLOBS`** – Specs requiring a backend with a human-challenge provider (`.antibot.cy.ts` suffix). Run in their own shard against `antibot-backend.ts`.
- **`ALL_SPEC_GLOBS`** – Union of the three above; intended for `specPattern` in `cypress.config.ts` so that `--spec` flags for visual or antibot runs still intersect successfully.

## Relationships

- **`cypress.config.ts`** – Imports `ALL_SPEC_GLOBS` to set `specPattern`.
- **`eslint.config.ts`** – Imports the glob constants to determine which parser/processor claims a given file.
- **`scripts/e2e/run-shards.ts`** – Imports `FUNCTIONAL_SPEC_GLOBS` (and likely `VISUAL_SPEC_GLOBS` / `ANTIBOT_SPEC_GLOBS`) to build the default shard schedule.
- **`scripts/e2e/print-live-shard.ts`** – Reads the glob constants to display which specs a given live shard covers.
- **`tests/unit/scripts/e2e/cypress-spec-globs.spec.ts`** – Asserts that the `--spec` strings used in `package.json` scripts resolve to the same file set as the exported globs (the one consumer that cannot import the constants at runtime).

## Notes

- Visual specs live **beside** functional specs in the same directory (distinguished only by the `.visual.cy.ts` suffix). Antibot specs follow the same convention with `.antibot.cy.ts`. Do not assume a separate folder.
- Cypress **intersects** `--spec` with `specPattern`; a spec outside the pattern cannot run even when named explicitly. This is why `ALL_SPEC_GLOBS` (not just functional) must back `specPattern`.
- The repo is TypeScript-only: all globs end in `.cy.ts`. A stray `.cy.js` is a lint failure, not a supported case.
- `package.json` cannot import this file, so its `--spec` arguments are hand-maintained and guarded only by the unit test above.
