/**
 * Accessibility for this module's own routes.
 *
 * Co-located so that deleting the module deletes its a11y coverage with it — a central list would
 * be left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts`
 * asserts every routed module has one of these, so the split cannot quietly lose a domain.
 *
 * The sweep itself lives in `tests/support/e2e/a11y-sweep.ts`; this file is the route list.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** The seeded non-admin user — `gino@pino.it`, the `cy.loginAs('user')` account. */
const USER_ID = '65de646a44f861fd83c13f13';

sweepA11y(
    'users',
    [
        ['users list', '/en/users'],
        ['user create', '/en/users/create'],
        ['user detail', `/en/users/${USER_ID}`],
        ['user edit', `/en/users/${USER_ID}/edit`]
    ],
    'admin'
);
