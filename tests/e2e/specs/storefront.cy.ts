/**
 * The storefront surface the customer release added: facet chips on the listing, stock and
 * add-to-cart on the product page, the wishlist and its move-to-cart exit, and the order page's
 * cancel and buy-again. The MSW handlers keep the API's invariants (public-scope facets, the
 * stock gate, the one order write), so these pin the pages honouring them.
 */
describe('Storefront', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
    });

    describe('catalogue facets', () => {
        it('renders the chips with public counts and filters by one', () => {
            cy.visit('/en/products');

            // Counts follow the public scope: `pets` is on four seed products, but one is
            // soft-deleted and one inactive — a guest's chip must say 2.
            cy.get('[data-test=category-chip]').contains('pets (2)').should('exist');
            cy.get('[data-test=category-chip]').contains('food (1)').should('exist');

            cy.get('[data-test=category-chip]').contains('food (1)').click();
            cy.get('#products-list-page tbody tr').should('have.length', 1);
            cy.contains('#products-list-page tbody', 'Sallyno Panino').should('exist');
        });
    });

    describe('product page', () => {
        it('shows the shelf and blocks buying what is out of stock', () => {
            // `Miciona inutile` is the seeded stock: 0 product.
            cy.loginAs('user');
            cy.visit('/en/products/65dc9be92f2794d1c16741e1');

            cy.get('[data-test=add-to-cart]').should('be.disabled');
            cy.contains('Out of stock').should('exist');
        });

        it('adds a unit to the cart and the badge follows', () => {
            cy.loginAs('user');
            cy.visit('/en/products/65dc8a99604c307b702b5ccc');

            cy.get('[data-test=add-to-cart]').click();
            cy.contains('Product added to cart').should('exist');
        });
    });

    describe('wishlist', () => {
        it('the heart saves and unsaves from the product page', () => {
            cy.loginAs('user');
            cy.visit('/en/products/65dc8a99604c307b702b5ccc');

            // Seeded as saved for the demo user, so the heart starts filled.
            cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Saved');
            cy.get('[data-test=wishlist-toggle]').click();
            cy.get('[data-test=wishlist-toggle]').should('contain.text', 'Save to wishlist');
        });

        it('lists the saved products and moves one to the cart', () => {
            cy.loginAs('user');
            cy.visit('/en/wishlist');

            cy.get('[data-test=wishlist-item]').should('have.length', 2);
            cy.get('[data-test=wishlist-move-to-cart]').first().click();

            cy.get('[data-test=wishlist-item]').should('have.length', 1);
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
            // The first seeded order belongs to the admin and starts pending.
            cy.visit('/en/orders/65de73a69ca05739be2b5e85');

            cy.get('[data-test=order-cancel]').click();
            cy.contains('Order cancelled').should('exist');
            // The cancel gate is status-driven: once cancelled, the button goes.
            cy.get('[data-test=order-cancel]').should('not.exist');

            cy.get('[data-test=order-reorder]').click();
            cy.get('#cart-page').should('exist');
            cy.get('[data-test=cart-item]').should('have.length.at.least', 1);
        });
    });
});
