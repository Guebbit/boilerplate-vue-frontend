import path from 'node:path';

/**
 * Default sibling-checkout location of the paired backend, relative to this repo's root.
 * Shared between `cypress.config.ts` (which passes it to `cy.exec('npm --prefix ...')` for
 * `cy.resetState()`) and `scripts/check-spec-identity.ts`, so the two can never silently
 * disagree about which backend they mean.
 *
 * It is the REPOSITORY name, so that the obvious thing produces a working layout:
 *
 *     git clone git@github.com:Guebbit/boilerplate-node-backend.git   # -> ./boilerplate-node-backend
 *
 * A checkout sitting under any other name — an older directory name, a second working copy — is
 * what `BACKEND_PATH` in `.env` is for, and is why this is a default rather than a constant.
 */
export const DEFAULT_BACKEND_PATH = '../boilerplate-node-backend';

/**
 * Resolves the backend checkout used by the live e2e profile: `BACKEND_PATH` env override when
 * set, `DEFAULT_BACKEND_PATH` otherwise — always returned as an absolute path, so a checkout
 * laid out differently from the sibling-directory convention fails with an unambiguous path
 * instead of a `npm --prefix` error relative to whatever `cwd` Cypress happened to have.
 *
 * An EMPTY value counts as unset, which `??` alone would not do. `.env-example` declares
 * `BACKEND_PATH =` with no value, and every `.env` copied from it therefore defines the variable
 * as `''`; resolved with `??` that becomes `path.resolve(cwd, '')` — this repo's own root, which
 * exists, so the sibling check would compare the frontend against itself and report the backend's
 * files as missing rather than saying it could not find the backend.
 */
export const resolveBackendPath = (): string =>
    path.resolve(process.cwd(), process.env.BACKEND_PATH?.trim() || DEFAULT_BACKEND_PATH);
