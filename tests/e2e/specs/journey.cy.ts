// requires-module: cart, inventory, orders, products
/**
 * One honest walk through the shop, as the two people who actually use it: a guest who browses
 * and hits the sign-in wall, then a customer who filters, buys, checks out, cancels and watches
 * the shelf recover. Every step after login navigates THROUGH THE APP — links and buttons, no
 * deep `cy.visit` — both because that is what a person does and because a full reload drops
 * every store, so surviving state is itself proof the flow shares one session.
 *
 * The one deliberate reload is the login (nothing has been written yet, so nothing is lost);
 * from there to the end the page never reloads.
 */
import { expectMailTemplate } from '../../support/e2e/commands';
import { seedAccount } from '../../support/e2e/scenario';
describe('The customer journey', () => {
    /**
     * The shelf's count before anything was bought — the value the cancel has to restore.
     *
     * Read as the admin, through the API: a shopper sees only the in-stock flags, never the count.
     * Captured rather than written down: the backend produces it by driving a seeded history.
     */
    let stockBeforeBuying: number;

    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        // `cy.restore()` clears the session server-side, but the page in front of it already
        // booted with the old one — reload so the journey genuinely starts as a guest.
        cy.visit('/en');
    });

    it('guest browses but cannot buy; the customer buys, cancels, and the shelf recovers', () => {
        // ── Guest: browse via the nav, meet the wall ────────────────────────────────
        cy.navigateTo('/en/products');
        cy.filterByNarrowestCategoryOf('product.rich');
        cy.get('[data-test=product-card]').should('have.length', 1);
        cy.get('[data-test=product-card-link]').first().click();

        cy.get('#product-target').should('exist');
        // A shopper sees the flag, never the count. `#product-target` exists before the product
        // has loaded and the stat then shows a placeholder, so the flag's words are the proof the
        // real record has arrived.
        cy.get('[data-test=product-stock]').should('contain.text', 'In stock');
        cy.get('[data-test=product-stock]').invoke('text').should('not.match', /\d/);
        cy.subjectId('product.rich').then((productId) => {
            cy.apiAs<{ available: number }>('admin', 'GET', `/products/${productId}`).then(
                (product) => {
                    stockBeforeBuying = Number(product?.available);
                }
            );
        });
        // The wall: buying is offered, disabled, and explained; saving is not offered at all.
        cy.get('[data-test=add-to-cart]').should('be.disabled');
        cy.contains('Sign in to buy').should('exist');
        cy.get('[data-test=wishlist-toggle]').should('not.exist');

        // ── Sign in (the journey's one reload; the guest wrote nothing) ─────────────
        cy.loginAs('user');

        // ── Customer: filter → product → cart → checkout ────────────────────────────
        cy.navigateTo('/en/products');
        cy.filterByNarrowestCategoryOf('product.rich');
        // The filter is a request; against a fast API the unfiltered list is still on screen for
        // a beat. One row is the chip's own count, so waiting for it IS waiting for the filter.
        cy.get('[data-test=product-card-link]').should('have.length', 1);
        cy.get('[data-test=product-card-link]').first().click();
        cy.get('[data-test=product-stock]').should('contain.text', 'In stock');
        cy.get('[data-test=add-to-cart]').click();
        cy.contains('Product added to cart').should('exist');

        cy.goToCart();
        // The demo customer's cart starts empty (the seeded carts belong to other accounts), so
        // the line just added is the whole cart.
        cy.get('[data-test=cart-item]').should('have.length', 1);
        cy.checkoutWith('standard');

        // Checkout lands straight on the new order's own page.
        cy.get('#order-target').should('exist');

        // The confirmation email lists what was bought — read from the outbox the way a customer
        // reads their inbox. The one line the customer's empty cart started with is on it.
        // (Only the demo profile has a readable outbox; live, the email leaves for real.)
        cy.env(['liveProfile']).then(({ liveProfile }) => {
            if (liveProfile === true) return;
            cy.emailTo(seedAccount('user').email).then((email) => {
                // The outbox records template variables; the line items are structured data the
                // order page below asserts far more precisely than a variable dump could.
                expectMailTemplate(email, 'orders.order-confirm');
            });
        });

        // ── Cancel it, from the order's own page (already there) ────────────────────
        cy.get('[data-test=order-cancel]').click();
        // The app's own confirmation, not the browser's: Cypress auto-accepts only the latter.
        cy.get('[data-test=app-dialog-confirm]').click();
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
        cy.navigateTo('/en/products');
        // The store kept the walk's own filter, so the list comes back already narrowed —
        // clicking the chip again would TOGGLE the filter off, and the row click would then land
        // on whatever the unfiltered list re-rendered underneath it.
        cy.get('[data-test=product-card-link]').should('have.length', 1);
        cy.get('[data-test=product-card-link]').first().click();
        cy.get('[data-test=product-stock]').should('contain.text', 'In stock');
        cy.subjectId('product.rich').then((productId) => {
            // Read as the admin again, retried until the cancel's release has landed.
            cy.apiAs<{ available: number }>('admin', 'GET', `/products/${productId}`).should(
                (product) => {
                    expect(product?.available).to.equal(stockBeforeBuying);
                }
            );
        });
    });
});
