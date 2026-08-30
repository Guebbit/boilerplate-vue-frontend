# scripts/cypress-spec-globs.ts

## Purpose

Single source of truth for Cypress spec file globs. The same set of patterns is needed in at least five places that cannot import from each other (Cypress config, ESLint config, shard runner, `package.json` scripts, and a test). This file centralises the three glob arrays so they stay in agreement; the one place that *can't* import them (`package.json`) is kept consistent by a dedicated unit test.

## Key elements

- **`FUNCTIONAL_SPEC_GLOBS`** – Two globs: the cross-cutting suite (`tests/e2e/specs/**/*.cy.ts`) and per-module functional specs (`src/modules/*/tests/e2e/**/!(*.visual).cy.ts`). Used as the default gate for `test:e2e` and its serial/live variants. Visual specs are excluded by the `!(*.visual)` suffix negation, not by directory.
- **`VISUAL_SPEC_GLOBS`** – Two globs for the pixel-diff suite (`tests/e2e/visual/**` and `*.visual.cy.ts` inside modules). Deliberately kept out of `npm run complete`; treated as a report, not a gate.
- **`ALL_SPEC_GLOBS`** – Spread of the two arrays above. Assigned to `specPattern` in `cypress.config.ts`. Must be the full union because `test:e2e:visual` passes its own `--spec` argument, and Cypress *intersects* `--spec` with `specPattern`; a narrower pattern would silently exclude the visual specs.

## Relationships

- **cypress.config.ts** – Reads `ALL_SPEC_GLOBS` as `specPattern`.
- **eslint.config.ts** – Reads the globs to decide which files the TS parser claims.
- **scripts/run-e2e-shards.ts** – Reads `FUNCTIONAL_SPEC_GLOBS` to determine what the default shard gate schedules.
- **tests/unit/scripts/cypress-spec-globs.spec.ts** – Asserts that the `--spec` strings hardcoded in `package.json` scripts resolve to the same file sets the constants produce (since `package.json` cannot import).
- **docs/getting-started.md / docs/reference/scripts.md** – Reference the scripts that depend on these globs.

## Notes

- Cypress **intersects** `--spec` with `specPattern`. A spec outside the pattern cannot run even when named explicitly; a glob one level too shallow just schedules fewer specs with a green result. Getting these globs wrong is therefore a silent failure.
- Visual specs live *beside* functional specs in each module (same directory, `.visual.cy.ts` suffix) so that deleting a module folder removes its baselines automatically.
- `.cy.ts` only — the repo is TypeScript-only and `lint` enforces it. A `.cy.js` is treated as an anomaly, not a supported case.
