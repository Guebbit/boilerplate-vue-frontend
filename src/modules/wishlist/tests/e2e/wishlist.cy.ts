/**
 * @module
 * The wishlist end to end: the heart on the product page, the saved list and its two exits —
 * the move-to-cart button, and the link on each saved item.
 *
 * Co-located for the reason `a11y.cy.ts` states: deleting the module deletes its coverage with
 * it. It ran from `tests/e2e/specs/storefront.cy.ts` before, which is where a whole domain's
 * functional coverage goes to be forgotten.
 *
 * Runs against the demo profile and, unchanged, against the live one — see
 * `docs/tools/live-e2e.md`.
 */
describe('Wishlist', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    it('the heart saves and unsaves from the product page', () => {
        cy.loginAs('user');
        /*
         * The subject is a product the demo user has ALREADY saved, so the heart starts
         * filled — found by reading the wishlist rather than by naming a seeded pair.
         *
         * The wishlist answers product IDS and fetches their titles in a second request, so an
         * item reads as its own id until that lands. Hence a retrying `should` that waits for
         * the text to name a catalogue entry, rather than a one-shot read of whatever is
         * there — which is the id, and matches nothing.
         */
        cy.publicProducts().then((products) => {
            const idByTitle = new Map(products.map((product) => [product.title, product.id]));

            cy.visit('/en/wishlist');
            cy.get('[data-test=wishlist-item] h2')
                .first()
                .should(($heading) => {
                    expect(
                        [...idByTitle.keys()],
                        'the first saved product is a listed one, with its title resolved'
                    ).to.include($heading.text().trim());
                })
                .then(($heading) => {
                    cy.visit(`/en/products/${idByTitle.get($heading.text().trim()) ?? ''}`);
                });
        });

        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Saved');
        cy.get('[data-test=wishlist-toggle]').click();
        cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Save to wishlist');
    });

    /*
     * The link is FOLLOWED rather than read, and the destination is asserted to be the product
     * the item names. A saved line renders a title and links to an id, so a link built from the
     * title lands on `/en/products/Wireless%20Headphones` — a 404 for every saved item, and
     * invisible to any case that reaches the product page by visiting a URL it assembled itself.
     */
    it('each saved item links to its own product page', () => {
        cy.loginAs('user');
        cy.visit('/en/wishlist');

        cy.get('[data-test=wishlist-item] h2 a')
            .first()
            .should(($link) => {
                expect($link.text().trim(), 'the title has resolved').to.not.equal('');
            })
            .then(($link) => {
                const title = $link.text().trim();
                cy.wrap($link).click();
                cy.get('#product-target').should('exist');
                // The page found the product, and it is the one the saved line named.
                cy.get('#product-target').should('contain.text', title);
            });
    });

    it('lists the saved products and moves one to the cart', () => {
        cy.loginAs('user');
        cy.visit('/en/wishlist');

        // The claim is that moving one REMOVES one, so the starting length is read rather
        // than asserted: a seed with three saved products tests the same rule.
        cy.get('[data-test=wishlist-item]').then(($items) => {
            const before = $items.length;
            expect(before, 'the demo user starts with something saved').to.be.greaterThan(0);

            cy.get('[data-test=wishlist-move-to-cart]').first().click();
            cy.get('[data-test=wishlist-item]').should('have.length', before - 1);
        });
        cy.visit('/en/cart');
        cy.get('[data-test=cart-item]').should('exist');
    });

    it('is a guarded route: guests land on the login', () => {
        cy.visit('/en/wishlist');
        cy.get('#login-page').should('exist');
    });
});
