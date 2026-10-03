/**
 * The catalogue's own share of the shell's resilience sweep — moved out of the central
 * `tests/e2e/specs/resilience.cy.ts`: route health for a shop-only page, plus every
 * dataset-shaped assertion that only means something with a catalogue behind it (an empty
 * search, pagination agreeing with the rows on screen, the sparse `barebones` record).
 *
 * These assert no exact value on purpose, the same reasoning as the central file: a page can
 * render a broken image, log a TypeError, or push a table off the viewport while every spec
 * naming a title or a count stays green.
 */

import {
    assertNoHorizontalOverflow,
    assertRouteIsHealthy
} from '../../../../../tests/support/e2e/resilience';

/** The default page size in `ProductsList.vue`'s `pageSizeOptions`. */
const DEFAULT_PAGE_SIZE = 10;

describe('the catalogue renders whatever the dataset holds', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('serves the public list quietly and inside the viewport', () => {
        assertRouteIsHealthy('/en/products', '#products-list-page');
        cy.get('[data-test=product-card]').should('have.length.at.least', 1);
    });

    /**
     * The `barebones` product — no description, categories or tags, every optional field at its
     * schema default — is the record a component assuming "every product has one" falls over on.
     */
    it('opens a detail page for every product an admin can see, including the sparse one', () => {
        cy.loginAs('admin');
        cy.visit('/en/products');
        cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);

        /*
         * Every href collected upfront, then visited directly, rather than returning to the
         * list between products: N page loads instead of 2N. The admin list is the one that
         * matters — it is the only view carrying the inactive and soft-deleted rows, and the
         * `barebones` product with no description, categories or tags.
         */
        cy.get('[data-test=row-view]')
            .then((viewButtons) => [...viewButtons].map((button) => button.getAttribute('href')!))
            .then((hrefs) => {
                expect(hrefs.length, 'no product rows to open').to.be.greaterThan(0);

                for (const href of hrefs) {
                    cy.visit(href);
                    cy.get('#product-target').should('exist');
                    assertNoHorizontalOverflow();
                }
            });
    });
});

describe('lists tolerate being empty', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('renders an empty catalogue rather than breaking when a search matches nothing', () => {
        /*
         * An empty list is a state the demo dataset cannot be in by standing still — every
         * seeded collection has rows on purpose — so it is reached the way a user reaches it:
         * by searching for something that is not there.
         */
        cy.visit('/en/products');
        cy.get('#products-list-page').should('exist');

        cy.get('[data-test=filter-text]')
            .should('not.be.disabled')
            .type('zzzz-no-such-product-zzzz');
        cy.get('#products-list-page form [type=submit]').click();

        // A guest is served the grid, never the staff table, so the rows to look for are cards.
        cy.get('[data-test=products-empty]').should('exist');
        cy.get('[data-test=product-card]').should('not.exist');
        assertNoHorizontalOverflow();
    });
});

describe('pagination agrees with the rows actually rendered', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('shows the pagination control only when the catalogue does not fit on one page', () => {
        cy.loginAs('admin');
        cy.visit('/en/products');
        cy.get('[data-test=list-row]', { timeout: 10_000 }).should('have.length.at.least', 1);

        /*
         * Written as the agreement between two things on screen rather than as a fixed
         * expectation, so it keeps meaning something as the demo catalogue grows: a full page
         * means there may be more and the control must be there; a partial page means this is
         * already everything and it must not be. `pageTotal` is server-reported — vue-toolkit's
         * own `useStructureCrudApi` stores the search response's `totalItems` alongside the page
         * that produced it — a local-only count would make this the branch that always takes the
         * "not exist" path regardless of how many pages actually exist, which is the bug this
         * test caught before that fix landed.
         */
        cy.get('[data-test=list-row]').then((rows) => {
            if (rows.length >= DEFAULT_PAGE_SIZE) cy.get('.v-pagination').should('exist');
            else cy.get('.v-pagination').should('not.exist');
        });
    });
});
