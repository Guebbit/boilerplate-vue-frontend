// requires-module: account, delivery, orders, payments
/**
 * @module
 * CU34 · What my timeline says. An order's timeline is read by two audiences. The customer sees what
 * happened to their order; staff also see what happened for reasons that are the shop's own business
 * (a hold's reason is an internal call), marked "hidden from the buyer", with who did it.
 *
 * The story is about the server deciding the audience: the page and the API for the customer carry
 * no staff-only row and no actor, and a row stays hidden after staff act on the order again. The
 * order is the seeded `order.onHold`, held for a risk check.
 */

/** The slice of a timeline entry this story reads. */
interface EntryLike {
    type: string;
    actor?: string;
}

/** The staff-only types this story watches for. */
const STAFF_ONLY = ['fulfillment_held', 'fulfillment_released'];

/** The goodwill refund the admin gives, in the payment's currency. */
const REFUND = 5;

describe('CU34 · What my timeline says', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('the customer reads the buyer rows only, staff read them all, and acting again keeps it so', () => {
        cy.subjectId('order.onHold').then((orderId) => {
            cy.step(
                'the customer reads the order: it was created, paid and processed, nothing more'
            );
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            for (const type of ['created', 'paid', 'processing'])
                cy.get(`[data-test=order-timeline-entry][data-type=${type}]`).should('exist');
            for (const type of STAFF_ONLY)
                cy.get(`[data-test=order-timeline-entry][data-type=${type}]`).should('not.exist');
            cy.get('[data-test=order-timeline-staff-only]').should('not.exist');
            cy.get('[data-test=order-timeline-actor]').should('not.exist');

            cy.step('the API says the same: no staff-only type, and no actor on any row');
            cy.apiAs<EntryLike[]>('user', 'GET', `/orders/${orderId}/timeline`).should(
                (entries) => {
                    expect(entries?.length, 'the buyer reads a timeline').to.be.greaterThan(0);
                    expect(entries?.map(({ type }) => type)).to.not.include.members(STAFF_ONLY);
                    for (const entry of entries ?? [])
                        expect(entry, 'no actor for the buyer').to.not.have.property('actor');
                }
            );

            cy.step('the admin reads the same page: the hold is there, marked, with who did it');
            cy.switchUser('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-timeline-entry][data-type=fulfillment_held]')
                .should('exist')
                .within(() => {
                    cy.get('[data-test=order-timeline-staff-only]').should('exist');
                    cy.get('[data-test=order-timeline-actor]').should('exist');
                });

            cy.step('the admin lets the group go and refunds part of the money');
            cy.get('[data-test=release]').click();
            cy.get('[data-test=release]').should('not.exist');
            cy.get('[data-test=order-timeline-entry][data-type=fulfillment_released]').should(
                'exist'
            );
            cy.visit(`/en/orders/${orderId}/edit`);
            cy.get('[data-test=refund-amount] input').type(REFUND.toFixed(2));
            cy.get('[data-test=button-refund-only]').click();
            cy.contains('Payment refunded. The order status is unchanged.').should('exist');

            cy.step(
                'the customer reloads: the refund shows, the hold and its release still do not'
            );
            cy.switchUser('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-timeline-entry][data-type=refund_issued]').should('exist');
            for (const type of STAFF_ONLY)
                cy.get(`[data-test=order-timeline-entry][data-type=${type}]`).should('not.exist');
            cy.get('[data-test=order-timeline-staff-only]').should('not.exist');
            cy.get('[data-test=order-timeline-actor]').should('not.exist');
        });
    });
});
