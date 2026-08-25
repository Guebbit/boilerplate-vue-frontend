/**
 * Where the Cypress specs live — the one definition, for everything that has to agree about it.
 *
 * The set is spelled in five places that cannot import from each other's world: this repo's
 * `cypress.config.ts` (`specPattern`), `eslint.config.ts` (which parser claims a file),
 * `scripts/run-e2e-shards.ts` (what the default gate schedules), and five `--spec` arguments in
 * `package.json`. Three of them read the constants below; `package.json` cannot import anything, so
 * `tests/unit/scripts/cypress-spec-globs.spec.ts` asserts its strings resolve to the same files instead.
 *
 * Getting this wrong is silent in the direction that matters. Cypress INTERSECTS `--spec` with
 * `specPattern`, so a spec outside the pattern cannot be run even when named explicitly — and a
 * glob one level too shallow simply schedules fewer specs than the reader believes, with a green
 * run to show for it.
 *
 * Two homes on purpose: the cross-cutting suite centrally, and each domain's specs inside the
 * domain so that deleting the folder takes them with it.
 */

/**
 * The specs the default gate runs — `npm run test:e2e` and its serial and live siblings.
 *
 * Visual specs live BESIDE the functional ones (`<name>.visual.cy.ts`) so a module owns its own
 * baselines, which is why they are excluded by suffix rather than by directory. Without the
 * exclusion the gate would silently acquire a dozen screenshot comparisons, and the first font
 * update would read as an application regression.
 */
export const FUNCTIONAL_SPEC_GLOBS = [
    'tests/e2e/specs/**/*.cy.ts',
    'src/modules/*/tests/e2e/**/!(*.visual).cy.ts'
];

/**
 * The pixel-diff suite, deliberately outside `npm run complete`: a screenshot answers to the
 * machine that recorded it, so it is a report rather than a gate.
 */
export const VISUAL_SPEC_GLOBS = [
    'tests/e2e/visual/**/*.cy.ts',
    'src/modules/*/tests/e2e/**/*.visual.cy.ts'
];

/**
 * Every spec Cypress may run. `specPattern` is this, not the functional half: a pattern narrower
 * than the union would make `test:e2e:visual`'s own `--spec` match nothing.
 *
 * `.cy.ts` only, because this repo is TypeScript-only and `lint` enforces it — a `.cy.js` would be
 * an anomaly worth failing on rather than a case worth supporting.
 */
export const ALL_SPEC_GLOBS = [...FUNCTIONAL_SPEC_GLOBS, ...VISUAL_SPEC_GLOBS];
