// requires-module: account, orders, users
/**
 * @module
 * AT5 · Staff lists keep their view. The address of a staff list holds its filters, so a reload
 * and a copied link each bring back the same rows, and a page past the end shows no rows and the
 * way back to page 1, not a crash. A filter replaces the history entry on purpose, so Back leaves
 * the list rather than undoing a search. The filters themselves are AT5's other files; this one
 * is about what the address remembers.
 */
import { listedIds, resetSearch, submitSearch } from '../../../support/e2e/steps';

/** One staff list and a way to narrow it. */
interface ListCase {
    /** What a failure reports. */
    name: string;
    /** The list's path. */
    path: string;
    /** Narrows the list to something other than everything, through the page's own controls. */
    narrow: () => void;
}

/**
 * Waits until the listed rows are exactly `expected`, retrying: a list answers after the address
 * changes, so a single read can catch the rows of the view before.
 *
 * @param expected - the ids the list must settle on
 */
const rowsSettleOn = (expected: string[]): void => {
    cy.get('[data-test=row-view]').should(($links) => {
        const ids = $links
            .toArray()
            .map((link) => String(link.getAttribute('href')).split('/').at(-1) ?? '');
        expect(ids).to.deep.equal(expected);
    });
};

const CASES: readonly ListCase[] = [
    {
        name: 'orders',
        path: '/en/sales/orders',
        narrow: () => {
            cy.pickOption('[data-test=filter-status]', 'Paid');
        }
    },
    {
        name: 'users',
        path: '/en/users',
        narrow: () => {
            cy.pickOption('[data-test=filter-active]', 'Inactive');
        }
    }
];

describe('AT5 · Staff lists keep their view', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
    });

    for (const list of CASES)
        it(`${list.name}: a reload and a copied link bring back the same rows`, () => {
            cy.trackNetwork();
            cy.visit(list.path);
            cy.settleNetwork();

            cy.step('narrow the list; the address now holds the filter');
            listedIds().then((everything) => {
                list.narrow();
                submitSearch();
                cy.location('search').should('not.equal', '');
                listedIds().then((narrowed) => {
                    expect(narrowed, 'a narrowed list').not.to.deep.equal(everything);
                    cy.location('href').then((narrowedHref) => {
                        cy.step('a reload brings back the same rows');
                        cy.reload();
                        rowsSettleOn(narrowed);

                        cy.step('a copied link, opened fresh, brings back the same rows');
                        cy.visit(narrowedHref);
                        rowsSettleOn(narrowed);

                        cy.step('reset: the whole list returns');
                        resetSearch();
                        rowsSettleOn(everything);
                    });
                });
            });
        });

    for (const list of CASES)
        it(`${list.name}: a page past the end shows no rows and offers page 1`, () => {
            cy.visit(`${list.path}?page=999`);
            cy.get('h1').should('exist');
            cy.get('[data-test=row-view]').should('not.exist');
            // The list says it has nothing here, and the pager still offers the way back to page 1.
            cy.get('.v-pagination').contains('button', '1').should('exist');
        });
});
