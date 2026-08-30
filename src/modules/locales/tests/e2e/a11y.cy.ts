/**
 * @module
 * Declares this module's routes (and one dialog state) to the shared `sweepA11y` runner, which
 * visits each and asserts against axe.
 *
 * `it` rather than `es` for the entries page: both are seeded, but `it` has exactly one entry, so
 * the sweep sees the table populated without depending on the bigger fixture's row count.
 */
import { sweepA11y } from '../../../../../tests/support/e2e/a11y-sweep';

sweepA11y(
    'locales',
    [
        ['languages board', '/en/locales'],
        ['dictionary board', '/en/locales/dictionary'],
        ['translation entries', '/en/locales/it'],
        {
            // The entry form dialog over the entries table: a modal with three fields, named
            // by its title, over a page the reader must not be able to wander into.
            name: 'translation entries, entry dialog open',
            route: '/en/locales/it',
            prepare: () => {
                cy.get('[data-test=entry-create]').click();
                cy.get('[data-test=entry-form]').should('be.visible');
            }
        }
    ],
    'admin'
);
