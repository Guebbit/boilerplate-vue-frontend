/**
 * @module
 * Cypress a11y sweep route list for the example module, run through the shared `sweepA11y`
 * helper: the signed-in screens as the demo editor (authoring is staff-only), and the one public screen as
 * an anonymous visitor.
 *
 * Co-located so deleting the module deletes its a11y coverage with it —
 * `tests/cross-cutting/a11y-coverage.spec.ts` asserts every routed module has one of these, so
 * the split cannot quietly lose a domain.
 *
 * The detail and edit pages need an example id. The backend's demo scenario seeds the editor a
 * draft, a published and an archived example at pinned ids (its `scenarios/examples.ts`), so no
 * example is created here; the public page reads the admin's published one.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

/** The editor's seeded published example. */
const EDITOR_PUBLISHED = '65e1a0000000000000000e01';

/** The admin's seeded published example, which the public page reads. */
const ADMIN_PUBLISHED = '65e1a0000000000000000e04';

sweepA11y(
    'example',
    [
        ['list', '/en/examples'],
        ['create', '/en/examples/create'],
        {
            // Submitted empty: every field shows its error, and an error message has to be
            // associated with its field (`aria-describedby`) and announced, not only coloured.
            name: 'create, submitted empty',
            route: '/en/examples/create',
            prepare: () => {
                cy.get('form button[type=submit]').click();
                cy.get('.v-messages__message').should('be.visible');
            }
        },
        ['detail', `/en/examples/${EDITOR_PUBLISHED}`],
        ['edit', `/en/examples/${EDITOR_PUBLISHED}/edit`]
    ],
    'editor'
);

sweepA11y('example, public', [['published example', `/en/examples/published/${ADMIN_PUBLISHED}`]]);
