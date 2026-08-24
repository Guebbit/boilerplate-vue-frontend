/**
 * The money and the logistics, walked honestly: the customer chooses shipping and watches its
 * cost freeze onto the order, pays with the declined card first (the API's demo provider refuses
 * a magic number), retries with a good one, and keeps the cancel that a PAID order deserves. The
 * admin ships an order and the parcel appears with its tracking
 * email, the courier button delivers it, and the inventory ledger tells the whole story with
 * reasons attached.
 *
 * Two sessions on purpose: each `it` builds its own state and never reloads mid-arc, so nothing
 * it wrote depends on a store surviving a page load — the same discipline as journey.cy.ts.
 */
/**
 * Moves the order on the edit page one step along its lifecycle.
 *
 * One step at a time because the select offers only what the API would accept from where the order
 * currently is: `paid → processing → shipped` is three statuses and two moves, and a jump straight
 * to `shipped` is not on the menu because it is not a move anyone may make.
 *
 * @param label - the option to pick, as it reads in the list
 * @param text - what the select should show once it is picked
 */
const moveOrderTo = (label: RegExp, text: string) => {
    cy.get('#order-edit-page .v-select').click();
    cy.get('.v-overlay__content .v-list-item').contains(label).click();
    cy.get('#order-edit-page .v-select').should('contain.text', text);
    cy.get('#order-edit-page button[type=submit]').click();
    cy.contains('Order updated successfully').should('exist');
};

describe('Commerce', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en');
    });

    it('the customer ships express, gets declined, pays, and can still cancel', () => {
        cy.loginAs('user');

        // ── Buy something ───────────────────────────────────────────────────────────
        cy.navigateTo('/en/products');
        cy.get('[data-test=category-chip]').contains('food (1)').click();
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=add-to-cart]').click();
        cy.contains('Product added to cart').should('exist');

        // ── Choose express at the cart; the selector quotes the flat rate ───────────
        cy.navigateViaMenu('account', '/en/cart');
        cy.get('[data-test=shipping-selector]').should('exist');
        cy.get('[data-test=shipping-method-express]').click();
        cy.get('[data-test=cart-checkout]').click();

        // ── The order froze the choice ──────────────────────────────────────────────
        cy.get('#orders-list-page tbody tr').should('have.length', 1);
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=order-shipping]').should('contain.text', 'express');

        // ── Pay: the magic decline first, then a card that works ────────────────────
        cy.get('[data-test=payment-panel]').should('exist');
        cy.get('[data-test=payment-card-input] input').should('not.be.disabled').clear();
        cy.get('[data-test=payment-card-input] input')
            .should('not.be.disabled')
            .type('4000 0000 0000 0002');
        cy.get('[data-test=payment-submit]').click();
        // Refused and retryable: the form is still there, the order still pending.
        cy.get('[data-test=payment-submit]').should('exist');
        cy.get('[data-test=order-cancel]').should('exist');

        cy.get('[data-test=payment-card-input] input').should('not.be.disabled').clear();
        cy.get('[data-test=payment-card-input] input')
            .should('not.be.disabled')
            .type('4242 4242 4242 4242');
        cy.get('[data-test=payment-submit]').click();
        cy.contains('Payment received').should('exist');
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');

        // ── Paid is still cancellable — the refund path exists now ──────────────────
        cy.get('[data-test=order-cancel]').should('exist');
        cy.get('[data-test=order-cancel]').click();
        // The app's own confirmation, not the browser's: Cypress auto-accepts only the latter.
        cy.get('[data-test=app-dialog-confirm]').click();
        cy.contains('Order cancelled').should('exist');
        cy.get('[data-test=order-cancel]').should('not.exist');
    });

    it('the admin ships, the courier delivers, and the ledger remembers why', () => {
        /*
         * Ship an order that has EARNED shipping. The state machine allows a pending order only
         * one move — cancelled — because shipping an unpaid order would be giving stock away;
         * `paid` is reached exclusively through the payment flow. So the customer buys and pays
         * first, for real — a spec that shipped a pending order directly would be asserting a
         * transition the API refuses.
         */
        cy.loginAs('user');
        cy.navigateTo('/en/products');
        cy.get('[data-test=category-chip]').contains('food (1)').click();
        cy.get('[data-test=row-view]').should('have.length', 1);
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=add-to-cart]').click();
        cy.contains('Product added to cart').should('exist');
        cy.navigateViaMenu('account', '/en/cart');
        cy.get('[data-test=cart-checkout]').click();
        cy.get('#orders-list-page tbody tr').should('have.length', 1);
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=payment-card-input] input').should('not.be.disabled').clear();
        cy.get('[data-test=payment-card-input] input')
            .should('not.be.disabled')
            .type('4242 4242 4242 4242');
        cy.get('[data-test=payment-submit]').click();
        cy.get('[data-test=payment-status]').should('contain.text', 'Paid');

        // The paid order's own edit page, reached by its id so the admin ships exactly it.
        // Log out first — an authenticated visit to /login redirects away, so `loginAs`
        // would never find its form.
        cy.location('pathname').then((pathname) => {
            const orderId = pathname.split('/').at(-1);

            cy.logout();
            cy.contains('gino@pino.it').should('not.exist');
            cy.loginAs('admin');
            cy.visit(`/en/orders/${orderId}/edit`);
        });
        cy.get('#order-edit-page').should('exist');
        // Interact only once the form has hydrated — the email field carries the record.
        cy.get('#order-edit-page [type=email]').should('not.have.value', '');
        moveOrderTo(/processing/i, 'Processing');
        moveOrderTo(/shipped/i, 'Shipped');

        // ── The parcel exists: tracking on the order page, the email in the outbox ──
        cy.contains('a', 'Back to order details').click();
        cy.get('[data-test=shipment-panel]').should('exist');
        cy.get('[data-test=shipment-tracking]').invoke('text').should('match', /TRK-/);
        cy.get('[data-test=shipment-status]').should('contain.text', 'Shipped');
        // By template, not recipient: whichever seeded customer's order the admin shipped,
        // the tracking email carries the code the panel shows.
        //
        // Only the demo profile has a readable outbox — `GET /__demo/emails` is mounted behind
        // `NODE_DEMO=true` — so live, the email leaves for real and there is nothing to read.
        // Guarded here rather than with `cy.skipUnlessDemo()` at the top of the test, because
        // everything around it is exactly what the live profile exists to prove: the shipment
        // panel above, and the courier and the ledger below. Same shape as `journey.cy.ts`.
        cy.env(['apiUrl', 'liveProfile']).then(({ apiUrl, liveProfile }) => {
            if (liveProfile === true) return;
            cy.request(`${String(apiUrl)}/__demo/emails`).then((response) => {
                const { emails } = response.body as {
                    emails: { template: string; lines?: string[] }[];
                };
                const shipped = emails.find(
                    ({ template }) => template === 'delivery.shipment-shipped'
                );
                expect(shipped, 'the shipped email in the outbox').to.not.equal(undefined);
                // Order-independent on purpose: the outbox records template variables, not rendered
                // body lines, and their order is the template's business.
                expect(shipped!.lines?.some((line) => line.includes('TRK-'))).to.equal(true);
            });
        });

        // ── The courier is a button, and it works exactly once ──────────────────────
        cy.get('[data-test=courier-advance]').click();
        cy.contains('The courier advanced').should('exist');
        cy.get('[data-test=shipment-status]').should('contain.text', 'Delivered');
        cy.get('[data-test=courier-advance]').should('not.exist');

        // ── The ledger: receive a delivery and read the story back ──────────────────
        cy.navigateViaMenu('admin', '/en/inventory');
        cy.get('#inventory-page').should('exist');

        // The board before, so the receipt can be read as a change rather than a number.
        cy.get('[data-test=level-row]').should('have.length.at.least', 1);

        cy.get('[data-test=receipt-product]').click();
        cy.get('.v-overlay__content .v-list-item').first().click();
        cy.get('[data-test=receipt-submit]').click();
        cy.contains('Delivery recorded').should('exist');

        /*
         * `receive` is the one transition that creates units: `onHand` rises and `reserved` does
         * not, so the delivery is sellable immediately. Asserting BOTH columns is the point — a
         * ledger that moved the wrong counter would still show a row, and still look right.
         */
        cy.get('[data-test=movement-row]').should('have.length.at.least', 1);
        cy.get('[data-test=movement-reason]').first().should('contain.text', 'Received');
        cy.get('[data-test=movement-row]')
            .first()
            .within(() => {
                cy.get('td').eq(2).should('contain.text', '+');
                cy.get('td').eq(3).should('have.text', '0');
            });
    });
});
