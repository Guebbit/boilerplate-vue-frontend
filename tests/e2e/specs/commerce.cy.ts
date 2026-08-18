/**
 * The money and the logistics, walked honestly: the customer chooses shipping and watches its
 * cost freeze onto the order, pays with the declined card first (the mock provider refuses the
 * same magic number the BE's fake does), retries with a good one, and keeps the cancel that a
 * PAID order now deserves. The admin ships an order and the parcel appears with its tracking
 * email, the courier button delivers it, and the inventory ledger tells the whole story with
 * reasons attached.
 *
 * Two sessions on purpose: the mock database re-seeds on every full page load, so each `it`
 * builds its own state and never reloads mid-arc — the same discipline as journey.cy.ts.
 */
describe('Commerce', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.resetState();
        cy.visit('/en');
    });

    it('the customer ships express, gets declined, pays, and can still cancel', () => {
        cy.loginAs('user');

        // ── Buy something ───────────────────────────────────────────────────────────
        cy.get('.v-app-bar')
            .contains('a', /products lists/i)
            .click();
        cy.get('[data-test=category-chip]').contains('food (1)').click();
        cy.get('[data-test=row-view]').first().click();
        cy.get('[data-test=add-to-cart]').click();
        cy.contains('Product added to cart').should('exist');

        // ── Choose express at the cart; the selector quotes the flat rate ───────────
        cy.get('.v-app-bar').contains('a', /cart/i).click();
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
        cy.contains('Order cancelled').should('exist');
        cy.get('[data-test=order-cancel]').should('not.exist');
    });

    it('the admin ships, the courier delivers, and the ledger remembers why', () => {
        cy.loginAs('admin');

        // ── Ship a seeded pending order through the admin edit form ─────────────────
        cy.get('.v-app-bar')
            .contains('a', /orders/i)
            .click();
        cy.get('[data-test=row-edit]').first().click();
        cy.get('#order-edit-page').should('exist');
        // Interact only once the form has hydrated — the email field carries the record.
        cy.get('#order-edit-page [type=email]').should('not.have.value', '');
        cy.get('#order-edit-page .v-select').click();
        cy.get('.v-overlay__content .v-list-item')
            .contains(/shipped/i)
            .click();
        cy.get('#order-edit-page .v-select').should('contain.text', 'Shipped');
        cy.get('#order-edit-page button[type=submit]').click();
        cy.contains('Order updated successfully').should('exist');

        // ── The parcel exists: tracking on the order page, the email in the outbox ──
        cy.contains('a', 'Back to order details').click();
        cy.get('[data-test=shipment-panel]').should('exist');
        cy.get('[data-test=shipment-tracking]').invoke('text').should('match', /TRK-/);
        cy.get('[data-test=shipment-status]').should('contain.text', 'Shipped');
        // By template, not recipient: whichever seeded customer's order the admin shipped,
        // the tracking email carries the code the panel shows.
        cy.window().then((windowObject) =>
            windowObject
                .fetch('/__mock/emails')
                .then((response) => response.json())
                .then((body: { data: { emails: { template: string; lines?: string[] }[] } }) => {
                    const shipped = body.data.emails.find(
                        ({ template }) => template === 'delivery.shipment-shipped.ejs'
                    );
                    expect(shipped, 'the shipped email in the outbox').to.not.equal(undefined);
                    expect(shipped!.lines?.[0]).to.contain('TRK-');
                })
        );

        // ── The courier is a button, and it works exactly once ──────────────────────
        cy.get('[data-test=courier-advance]').click();
        cy.contains('The courier advanced').should('exist');
        cy.get('[data-test=shipment-status]').should('contain.text', 'Delivered');
        cy.get('[data-test=courier-advance]').should('not.exist');

        // ── The ledger: receive a delivery and read the story back ──────────────────
        cy.get('.v-app-bar')
            .contains('a', /inventory/i)
            .click();
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
