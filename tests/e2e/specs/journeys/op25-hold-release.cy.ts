// requires-module: account, delivery, orders
/**
 * @module
 * OP25 · Hold a group back, then let it go. The seeded order sits on a staff hold ("High risk"):
 * its card says so, offers no ship button and a release one. Releasing makes it shippable again;
 * holding it once more asks for a reason and an optional note, and the card and the order's
 * fulfilment status follow.
 *
 * The staff reasons are three (`awaiting_stock` belongs to the stock itself and is never offered),
 * and the buttons come from the card's own actions — the screen holds no rule of its own.
 */

/** The slice of an order this story reads. */
interface OrderLike {
    fulfillmentStatus: string;
}

/** The slice of an order's fulfilment this story reads. */
interface FulfilmentLike {
    fulfillmentOrders: { id: string }[];
}

describe('OP25 · Hold a group back, then let it go', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('releases a staff hold, and puts the group on hold again with a reason', () => {
        cy.subjectId('order.onHold').then((orderId) => {
            cy.step('the admin finds the group on hold, with its reason and no ship button');
            cy.loginAs('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=fulfillment-order-status]').should('contain.text', 'On hold');
            cy.get('[data-test=fulfillment-order-hold-reason]').should('contain.text', 'High risk');
            cy.get('[data-test=open-ship]').should('not.exist');
            cy.get('[data-test=open-hold]').should('not.exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('fulfillmentStatus')
                .should('equal', 'on_hold');

            cy.step('releases it: the group can ship again');
            cy.get('[data-test=release]').click();
            cy.get('[data-test=release]').should('not.exist');
            cy.get('[data-test=fulfillment-order-status]').should(
                'contain.text',
                'Not shipped yet'
            );
            cy.get('[data-test=open-ship]').should('exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('fulfillmentStatus')
                .should('not.equal', 'on_hold');

            cy.step(
                'holds it again: a reason is required, and the three staff reasons are offered'
            );
            cy.get('[data-test=open-hold]').click();
            cy.get('[data-test=hold-submit]').should('be.disabled');
            cy.get('[data-test=hold-reason]').click();
            cy.get('[role=listbox] [role=option]').should('have.length', 3);
            cy.get('[role=listbox] [role=option]').contains('Incorrect address').click();
            cy.get('[data-test=hold-note] textarea').type('call the buyer first');
            cy.get('[data-test=hold-submit]').should('not.be.disabled').click();
            cy.get('[data-test=hold-dialog]').should('not.exist');

            cy.step('the card says why, and the order is on hold again');
            cy.get('[data-test=fulfillment-order-status]').should('contain.text', 'On hold');
            cy.get('[data-test=fulfillment-order-hold-reason]').should(
                'contain.text',
                'Incorrect address'
            );
            cy.get('[data-test=fulfillment-order-note]').should(
                'contain.text',
                'call the buyer first'
            );
            cy.get('[data-test=open-ship]').should('not.exist');
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('fulfillmentStatus')
                .should('equal', 'on_hold');

            cy.step('the hold dialog’s Cancel writes nothing');
            cy.get('[data-test=release]').click();
            cy.get('[data-test=open-hold]').click();
            cy.get('[data-test=hold-cancel]').click();
            cy.get('[data-test=hold-dialog]').should('not.exist');
            cy.get('[data-test=fulfillment-order-status]').should(
                'contain.text',
                'Not shipped yet'
            );
            cy.apiAs<OrderLike>('admin', 'GET', `/orders/${orderId}`)
                .its('fulfillmentStatus')
                .should('not.equal', 'on_hold');

            cy.step('a stale dialog: someone else held it first, and the refusal shows in place');
            cy.get('[data-test=open-hold]').click();
            cy.apiAs<FulfilmentLike>('admin', 'GET', `/delivery/order/${orderId}`).then(
                (fulfilment) => {
                    cy.apiAs(
                        'admin',
                        'POST',
                        `/delivery/fulfillment-orders/${fulfilment?.fulfillmentOrders[0]?.id ?? ''}/hold`,
                        { reason: 'other' }
                    );
                }
            );
            cy.get('[data-test=hold-reason]').click();
            cy.get('[role=listbox] [role=option]').contains('High risk').click();
            cy.get('[data-test=hold-submit]').should('not.be.disabled').click();
            cy.get('[data-test=hold-error]').should('not.be.empty');
            cy.get('[data-test=hold-dialog]').should('exist');
            cy.get('[data-test=hold-cancel]').click();

            cy.step('staff see the hold and the release on the timeline, marked staff-only');
            cy.reload();
            for (const type of ['fulfillment_held', 'fulfillment_released']) {
                cy.get(`[data-test=order-timeline-entry][data-type=${type}]`)
                    .first()
                    .find('[data-test=order-timeline-staff-only]')
                    .should('exist');
            }

            cy.step('the buyer sees neither the note nor the held and released rows');
            cy.logout();
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-timeline]').should('exist');
            cy.get('[data-test=fulfillment-order-note]').should('not.exist');
            cy.get('[data-test=order-timeline-entry][data-type=fulfillment_held]').should(
                'not.exist'
            );
            cy.get('[data-test=order-timeline-entry][data-type=fulfillment_released]').should(
                'not.exist'
            );
        });
    });
});
