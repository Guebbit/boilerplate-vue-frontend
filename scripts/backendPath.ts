import path from 'node:path';

/**
 * Default sibling-checkout location of the paired backend, relative to this repo's root.
 * Shared between `cypress.config.ts` (which passes it to `cy.exec('npm --prefix ...')`) and
 * `scripts/preflight-live.ts` (which validates it before a single spec runs), so the two can
 * never silently disagree about which backend they mean.
 */
export const DEFAULT_BACKEND_PATH = '../boilerplate-node-api-mongodb-mongoose';

/**
 * Resolves the backend checkout used by the live e2e profile: `BACKEND_PATH` env override when
 * set, `DEFAULT_BACKEND_PATH` otherwise — always returned as an absolute path, so a checkout
 * laid out differently from the sibling-directory convention fails with an unambiguous path
 * instead of a `npm --prefix` error relative to whatever `cwd` Cypress happened to have.
 */
export const resolveBackendPath = (): string =>
    path.resolve(process.cwd(), process.env.BACKEND_PATH ?? DEFAULT_BACKEND_PATH);
