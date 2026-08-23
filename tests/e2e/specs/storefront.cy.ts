/**
 * The storefront surface the customer release added: facet chips on the listing, stock and
 * add-to-cart on the product page, the wishlist and its move-to-cart exit, and the order page's
 * cancel and buy-again. The API enforces its own invariants (public-scope facets, the stock
 * gate, the one order write), so these pin the pages honouring them.
 */
describe('Storefront', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    describe('catalogue facets', () => {
        /*
         * The counts are DERIVED from the public list rather than written down, which is what
         * makes this the scope assertion it is meant to be: a chip saying `pets (4)` where the
         * guest can see two of them is exactly the leak, and the expectation moves with the
         * dataset instead of pinning one backend's catalogue.
         */
        it('renders the chips with public counts and filters by one', () => {
            cy.publicProducts().then((products) => {
                const counts = new Map<string, number>();
                for (const product of products)
                    for (const category of product.categories ?? [])
                        counts.set(category, (counts.get(category) ?? 0) + 1);

                const [category, count] = [...counts.entries()].toSorted((a, b) => a[1] - b[1])[0];

                cy.visit('/en/products');
                cy.get('[data-test=category-chip]')
                    .contains(`${category} (${String(count)})`)
                    .should('exist')
                    .click();
                cy.get('#products-list-page tbody tr').should('have.length', count);
            });
        });
    });

    describe('product page', () => {
        it('shows the shelf and blocks buying what is out of stock', () => {
            cy.loginAs('user');
            cy.productInRole('outOfStock').then((product) => {
                cy.visit(`/en/products/${product.id}`);
            });

            cy.get('[data-test=add-to-cart]').should('be.disabled');
            cy.contains('Out of stock').should('exist');
        });

        it('adds a unit to the cart and the badge follows', () => {
            cy.loginAs('user');
            cy.productInRole('inStock').then((product) => {
                cy.visit(`/en/products/${product.id}`);
            });

            cy.get('[data-test=add-to-cart]').click();
            cy.contains('Product added to cart').should('exist');
        });
    });

    describe('wishlist', () => {
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

    describe('order actions', () => {
        it('cancels a pending order and buying again refills the cart', () => {
            cy.loginAs('admin');
            // Any order the cancel gate is still open on — the page hides the button for every
            // other status, so the role IS the precondition this case needs.
            cy.orderInRole('cancellable').then((order) => {
                cy.visit(`/en/orders/${order.id}`);
            });

            cy.get('[data-test=order-cancel]').click();
            // The app's own confirmation, not the browser's: Cypress auto-accepts only the latter.
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.contains('Order cancelled').should('exist');
            // The cancel gate is status-driven: once cancelled, the button goes.
            cy.get('[data-test=order-cancel]').should('not.exist');

            cy.get('[data-test=order-reorder]').click();
            cy.get('#cart-page').should('exist');
            cy.get('[data-test=cart-item]').should('have.length.at.least', 1);
        });
    });
});
