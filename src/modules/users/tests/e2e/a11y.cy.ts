/**
 * @module
 * Cypress a11y sweep route list for the users module, run through the shared `sweepA11y` helper
 * as the admin.
 *
 * Co-located so deleting the module deletes its a11y coverage with it — a central list would be
 * left naming routes the app no longer serves. `tests/cross-cutting/a11y-coverage.spec.ts` asserts
 * every routed module has one of these, so the split cannot quietly lose a domain.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** iPhone 14-class portrait — the width `DataTable.vue`'s `mobile-breakpoint` stacks rows below. */
const PHONE = [390, 844] as const;

/*
 * The subject is the seeded non-admin — the `cy.loginAs('user')` account — asked for its own id
 * rather than told one, so the sweep addresses whichever backend the profile started. Not the
 * admin: the sweep signs in as the admin, and a page rendering your own row hides the controls
 * that act on someone else's.
 */
/**
 * Resolves the detail-page URL of the seeded non-admin account.
 */
const userDetail = () => cy.accountInRole('user').then((account) => `/en/users/${account.id}`);

/**
 * Resolves the edit-page URL of the seeded non-admin account.
 */
const userEdit = () => cy.accountInRole('user').then((account) => `/en/users/${account.id}/edit`);

sweepA11y(
    'users',
    [
        ['users list', '/en/users'],
        // The 8-column table stacked into cards below `sm` — the layout the desktop sweep never sees.
        { name: 'users list, phone viewport', route: '/en/users', viewport: PHONE },
        ['user create', '/en/users/create'],
        ['user detail', userDetail],
        ['user edit', userEdit]
    ],
    'admin'
);
