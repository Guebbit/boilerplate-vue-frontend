/**
 * One honest walk through the shop, as the two people who actually use it: a guest who browses
 * and hits the sign-in wall, then a customer who filters, buys, checks out, cancels and watches
 * the shelf recover. Every step after login navigates THROUGH THE APP — links and buttons, no
 * deep `cy.visit` — both because that is what a person does and because the mock database
 * re-seeds on a full reload, so surviving state is itself proof the flow shares one session.
 *
 * The one deliberate reload is the login (nothing has been written yet, so nothing is lost);
 * from there to the end the page never reloads.
 */
describe('The customer journey', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        // The reset clears the mock session, but the page already loaded with the dev-default
        // one — reload so the journey genuinely starts as a guest, like every other spec.
        cy.visit('/en');
    });

    it('guest browses but cannot buy; the customer buys, cancels, and the shelf recovers', () => {
        // ── Guest: browse via the nav, meet the wall ────────────────────────────────
        cy.get('.v-app-bar')
            .contains('a', /products lists/i)
            .click();
        cy.get('[data-test=category-chip]').contains('food (1)').click();
        cy.get('#products-list-page tbody tr').should('have.length', 1);
        cy.get('[data-test=row-view]').first().click();

        cy.get('#product-target').should('exist');
        cy.get('[data-test=product-stock]').should('contain.text', '25');
        // The wall: buying is offered, disabled, and explained; saving is not offered at all.
        cy.get('[data-test=add-to-cart]').should('be.disabled');
        cy.contains('Sign in to buy').should('exist');
        cy.get('[data-test=wishlist-toggle]').should('not.exist');

        // ── Sign in (the journey's one reload; the guest wrote nothing) ─────────────
        cy.loginAs('user');

        // ── Customer: filter → product → cart → checkout ────────────────────────────
        cy.get('.v-app-bar')
            .contains('a', /products lists/i)
            .click();
        cy.get('[data-test=category-chip]').contains('food (1)').click();
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=product-stock]').should('contain.text', '25');
        cy.get('[data-test=add-to-cart]').click();
        cy.contains('Product added to cart').should('exist');

        cy.get('.v-app-bar').contains('a', /cart/i).click();
        // The customer's seeded cart already holds a line; the one just added joins it.
        cy.get('[data-test=cart-item]').should('have.length', 2);
        cy.get('[data-test=cart-checkout]').click();

        // Checkout lands on the orders list; scoped to the customer, it holds exactly
        // the order just placed — their seeded order is soft-deleted and must not show.
        cy.get('#orders-list-page').should('exist');
        cy.get('#orders-list-page tbody tr').should('have.length', 1);

        // The confirmation email lists what was bought — read from the outbox the way a customer
        // reads their inbox. Both cart lines are on it: the seeded one and the one added above.
        // (Only the mock profile has a readable outbox; live, the email leaves for real.)
        cy.env(['apiMockEnabled']).then(({ apiMockEnabled }) => {
            if (apiMockEnabled === false) return;
            cy.mockEmailTo('gino@pino.it').then((email) => {
                expect(email.template).to.equal('orders.order-confirm.ejs');
                expect(email.lines, 'the bought lines').to.have.length(2);
            });
        });

        // ── Cancel it, from the order's own page ────────────────────────────────────
        cy.get('[data-test=row-view]').first().click();
        cy.get('#order-target').should('exist');
        cy.get('[data-test=order-cancel]').click();
        cy.contains('Order cancelled').should('exist');
        // The gate is the status: once cancelled, the button is gone and buy-again stays.
        cy.get('[data-test=order-cancel]').should('not.exist');
        cy.get('[data-test=order-reorder]').should('exist');

        // ── The shelf recovered — same product, same count as the journey began with ─
        // The walk's toasts stack over the table's action column until dismissed — close them
        // the way a person does before clicking through the list again.
        cy.get('.v-alert').each((alert) => {
            cy.wrap(alert).find('.v-alert__close button').click();
        });
        cy.get('.v-alert').should('not.exist');
        cy.get('.v-app-bar')
            .contains('a', /products lists/i)
            .click();
        cy.get('[data-test=category-chip]').contains('food (1)').click();
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=product-stock]').should('contain.text', '25');
    });
});
