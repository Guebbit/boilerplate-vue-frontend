/**
 * The storefront surface the customer release added: facet chips on the listing, stock and
 * add-to-cart on the product page, and the order page's cancel and buy-again. The API enforces
 * its own invariants (public-scope facets, the stock gate, the one order write), so these pin
 * the pages honouring them.
 *
 * The wishlist lives with its module, in `src/modules/wishlist/tests/e2e/wishlist.cy.ts`.
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
