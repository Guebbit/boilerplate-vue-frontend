/**
 * @module
 * Cypress a11y sweep route list for the api-keys module, run through the shared `sweepA11y`
 * helper as the owner — the only preset role holding `apikeys.*` (through `all.manage`).
 *
 * Co-located so deleting the module deletes its a11y coverage with it —
 * `tests/cross-cutting/a11y-coverage.spec.ts` asserts every routed module has one of these, so
 * the split cannot quietly lose a domain.
 *
 * There is no detail or edit page — a credential's fields are fixed at mint time — so the only
 * state worth a separate sweep beyond the two bare routes is the list with an existing row: the
 * empty-table render and the chips/status/actions render are different DOM, and
 * `cy.mintApiKey()` is what gets one there without a seeded demo fixture to look one up from.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** iPhone 14-class portrait — the width `DataTable.vue`'s `mobile-breakpoint` stacks rows below. */
const PHONE = [390, 844] as const;

/**
 * The list, after minting one credential — the row-rendering state the bare route never reaches.
 */
const apiKeysListWithRow = () => cy.mintApiKey().then(() => '/en/api-keys');

sweepA11y(
    'api-keys',
    [
        ['list, empty', '/en/api-keys'],
        { name: 'list, with a credential', route: apiKeysListWithRow },
        // The table stacked into cards below `sm` — the layout the desktop sweep never sees.
        {
            name: 'list, phone viewport',
            route: apiKeysListWithRow,
            viewport: PHONE
        },
        ['create', '/en/api-keys/create'],
        {
            // Submitted empty: every field shows its error, and an error message has to be
            // associated with its field (`aria-describedby`) and announced, not only coloured.
            name: 'create, submitted empty',
            route: '/en/api-keys/create',
            prepare: () => {
                cy.get('form button[type=submit]').click();
                cy.get('.v-messages__message').should('be.visible');
            }
        }
    ],
    'owner'
);
