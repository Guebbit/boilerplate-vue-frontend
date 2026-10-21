// requires-module: account, inventory, orders, products, users, webhooks
/**
 * @module
 * AT5 · Staff lists keep their view. The address of a staff list holds its filters, so a reload
 * and a copied link each bring back the same rows, and a page past the end shows no rows and the
 * way back to page 1, not a crash. A filter replaces the history entry on purpose, so Back leaves
 * the list rather than undoing a search. The filters themselves are AT5's other files; this one
 * is about what the address remembers. The stock ledger and the stock board live-filter (no search
 * button) and key their query with a prefix, so they have a describe of their own below.
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

/**
 * Waits until the ledger shows at least one movement and every one of them is an adjustment: the
 * list refetches on load, so a single read can catch the unfiltered rows.
 */
const onlyAdjusted = (): void => {
    cy.get('[data-test=movement-reason]').should(($chips) => {
        expect($chips.length).to.be.greaterThan(0);
        for (const chip of $chips.toArray()) expect(chip.textContent).to.contain('Adjusted');
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
    },
    {
        name: 'products',
        path: '/en/products',
        narrow: () => {
            cy.pickOption('[data-test=filter-active]', 'Inactive');
        }
    },
    {
        name: 'webhook subscriptions',
        path: '/en/webhooks/subscriptions',
        narrow: () => {
            cy.pickOption('[data-test=filter-enabled]', 'Disabled');
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

describe('AT5 · The stock board and ledger keep their view', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
    });

    it('board: "low stock only" survives a reload and a copied link', () => {
        cy.visit('/en/inventory');
        cy.get('[data-test=level-row]').should('exist');
        cy.get('[data-test=levels-total]')
            .invoke('text')
            .then((everything) => {
                cy.get('[data-test=levels-low-only] input').check();
                cy.get('[data-test=levels-total]').should('not.have.text', everything);
                cy.location('search').should('contain', 'levels-lowOnly');
                cy.get('[data-test=levels-total]')
                    .invoke('text')
                    .then((narrowed) => {
                        cy.location('href').then((narrowedHref) => {
                            cy.step('a reload brings back the switch and the count');
                            cy.reload();
                            cy.get('[data-test=levels-low-only] input').should('be.checked');
                            cy.get('[data-test=levels-total]').should('have.text', narrowed);

                            cy.step('a copied link, opened fresh, does the same');
                            cy.visit(narrowedHref);
                            cy.get('[data-test=levels-low-only] input').should('be.checked');
                            cy.get('[data-test=levels-total]').should('have.text', narrowed);
                        });
                    });
            });
    });

    it('ledger: the reason filter survives a reload and a copied link', () => {
        cy.subjectId('product.inStock').then((productId) => {
            cy.apiAs('admin', 'POST', '/inventory/adjustments', {
                productId,
                delta: -1,
                note: 'AT5 view'
            });
            cy.visit('/en/inventory');
            cy.get('[data-test=movement-reason]').should('exist');
            cy.pickOption('[data-test=movements-filter-reason]', 'Adjusted');
            cy.location('search').should('contain', 'movements-reason');
            cy.location('href').then((narrowedHref) => {
                cy.step('a reload still shows only adjustments');
                cy.reload();
                onlyAdjusted();

                cy.step('a copied link, opened fresh, does the same');
                cy.visit(narrowedHref);
                onlyAdjusted();
            });
        });
    });

    for (const [name, prefix, rows] of [
        ['board', 'levels', '[data-test=level-row]'],
        ['ledger', 'movements', '[data-test=movement-row]']
    ] as const)
        it(`${name}: a page past the end shows no rows and offers page 1`, () => {
            cy.visit(`/en/inventory?${prefix}-page=999`);
            cy.get('h1').should('exist');
            cy.get(rows).should('not.exist');
            cy.get('.v-pagination').contains('button', '1').should('exist');
        });
});
