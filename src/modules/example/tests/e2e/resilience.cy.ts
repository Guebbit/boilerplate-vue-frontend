/**
 * The example module's own share of the shell's resilience sweep
 * (`tests/e2e/specs/resilience.cy.ts`): list, detail, edit and the public page render, log nothing
 * unexpected and fit the viewport. It names no value, for the reason the central file gives.
 */
import { assertRouteIsHealthy } from '../../../../../tests/support/e2e/resilience';

/** The editor's seeded published example. */
const EDITOR_PUBLISHED = '65e1a0000000000000000e01';

/** The admin's seeded published example, which the public page reads. */
const ADMIN_PUBLISHED = '65e1a0000000000000000e04';

describe('the example pages render whatever they hold', () => {
    describe('as the editor', () => {
        beforeEach(() => {
            cy.visit('/en');
            cy.restore();
            cy.loginAs('editor');
        });

        it('serves the list quietly and inside the viewport', () => {
            assertRouteIsHealthy('/en/examples', '#examples-list-page');
        });

        it('serves the detail quietly and inside the viewport', () => {
            assertRouteIsHealthy(`/en/examples/${EDITOR_PUBLISHED}`, '#example-target');
        });

        it('serves the edit form quietly and inside the viewport', () => {
            assertRouteIsHealthy(`/en/examples/${EDITOR_PUBLISHED}/edit`, '#example-edit-page');
        });
    });

    it('serves the public page to a guest quietly and inside the viewport', () => {
        cy.visit('/en');
        cy.restore();
        assertRouteIsHealthy(
            `/en/examples/published/${ADMIN_PUBLISHED}`,
            '#example-published-page'
        );
    });
});
