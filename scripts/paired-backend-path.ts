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

/**
 * The command `cy.resetState()` runs to put the live backend's database back to its seed state,
 * or `undefined` when `LIVE_RESET_COMMAND` is unset — in which case the live profile simply does
 * not reset between specs, rather than shelling into a guess.
 *
 * A command rather than a script name, because the two paired backends do not offer the reset
 * through the same runner: the TypeScript one is an npm script, and the PHP one refuses to put
 * anything that touches the database into its `package.json` at all (see that repo's
 * `docs/tools/why-node-is-still-here.md`) — there it is `composer host -- db:seed:reset`. Both
 * spellings live in `.env-example`, which is where the choice belongs; nothing is hardcoded here,
 * so a checkout that never set the variable cannot silently run one backend's reset against the
 * other's.
 *
 * `{backend}` is substituted with the resolved absolute backend path, so the value does not have
 * to repeat what `BACKEND_PATH` already says. An EMPTY value counts as unset, for the same reason
 * `BACKEND_PATH` does: every `.env` copied from `.env-example` defines it.
 */
export const resolveLiveResetCommand = (): string | undefined => {
    const command = process.env.LIVE_RESET_COMMAND?.trim();
    return command ? command.replaceAll('{backend}', resolveBackendPath()) : undefined;
};

/**
 * The command `npm run backend:demo` runs to boot the paired backend's demo profile, or
 * `undefined` when `BACKEND_DEMO_COMMAND` is unset — in which case nothing is booted, and a
 * backend already listening is what the suite talks to.
 *
 * Parameterised for the reason `LIVE_RESET_COMMAND` above is: the two paired backends do not
 * expose the demo profile through the same runner. The TypeScript one is an npm script, and the
 * PHP one keeps database-shaped commands out of `package.json` entirely — there it is
 * `composer demo`, which `npm --prefix` cannot reach. Both spellings live in `.env-example`.
 *
 * `{backend}` is substituted with the resolved absolute backend path. An EMPTY
 * `BACKEND_DEMO_COMMAND` counts as unset, for the same reason `BACKEND_PATH` does.
 *
 * Split on whitespace rather than run through a shell: the backend is spawned with `stdio:
 * 'inherit'` (or piped, per caller) and killed by signal when the test runner ends, and an
 * intervening shell would take the signal instead of the server it wrapped.
 */
export const resolveBackendDemoCommand = (): readonly string[] | undefined => {
    const command = process.env.BACKEND_DEMO_COMMAND?.trim();
    return command ? command.replaceAll('{backend}', resolveBackendPath()).split(/\s+/) : undefined;
};
