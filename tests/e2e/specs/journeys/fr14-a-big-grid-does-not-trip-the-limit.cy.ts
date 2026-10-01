// requires-module: products, wishlist
/**
 * @module
 * FR14 · A big grid doesn't trip the rate limit. A signed-in shopper asks for 50 products a page,
 * flips three pages and opens one. Every card carries a heart, and a heart has to know what is
 * saved: if each one asked the server, one page would cost 50 requests against the backend's
 * per-minute budget and a few page flips would be refused.
 *
 * The heart's read is shared, so the whole visit costs ONE `GET /wishlist`, and nothing in it is
 * answered with a 429. The budget itself is the backend's (`NODE_RATE_LIMIT_MAX`); this checks the
 * app does not spend it on 49 answers it already has.
 */

/** Cards a page shows when the shopper picks the largest page size. */
const PAGE_SIZE = 50;

describe('FR14 · A big grid does not trip the rate limit', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('costs one wishlist read for a 50-card grid across three pages and a product', () => {
        // Every refusal the page meets, whatever the route — a 429 anywhere is the failure.
        const refused: string[] = [];
        cy.intercept('**', (request) => {
            request.on('response', (response) => {
                if (response.statusCode === 429) refused.push(request.url);
            });
        });
        cy.intercept('GET', '**/wishlist').as('wishlist');

        cy.step('a signed-in shopper asks for the largest page size');
        cy.loginAs('user');
        cy.navigateTo('/en/products');
        cy.pickOption('[data-test=page-size]', '50');
        cy.get('[data-test=product-card]').should('have.length', PAGE_SIZE);

        cy.step('three pages of it are flipped through');
        for (const page of [2, 3]) {
            cy.get('.v-pagination__next button').click();
            cy.get(`.v-pagination__item--is-active`).should('contain.text', String(page));
            cy.get('[data-test=product-card]').should('have.length.at.least', 1);
        }

        cy.step('a product is opened from the last page');
        cy.get('[data-test=product-card-link]').first().click();
        cy.get('[data-test=wishlist-toggle]').should('exist');

        cy.step('the hearts cost one read in all, and nothing was refused');
        cy.get('@wishlist.all').should('have.length', 1);
        cy.then(() => {
            expect(refused, 'requests answered 429').to.deep.equal([]);
        });
    });
});
