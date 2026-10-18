// requires-module: account, delivery, orders
/**
 * @module
 * OP30 · Ship in part, correct a tracking code, and the dialog's edges. The warehouse starts a paid
 * order of two units and opens the ship dialog: Cancel writes nothing, a quantity beyond what
 * remains (or all zeros) shuts the submit, and one unit goes out under a typo of a code. The code
 * is corrected on the shipment, the dialog is shown stale when someone else ships the rest first,
 * and once both parcels are delivered the tracking control is gone and the door answers 409. The
 * buyer ends up with the corrected code only.
 */
import { loginDevice } from '../../../support/e2e/harness';
import { eventually, refusedWith } from '../../../support/e2e/steps';
import { byTemplate } from '../../../../scripts/e2e/mail-filters';
import { mailMentions } from '../../../../scripts/e2e/mail-message';

/** The typo the warehouse ships under, and the code it is corrected to. */
const TYPO = 'TRK-OP3O';

/** The corrected code. */
const FIXED = 'TRK-OP30';

/** The slice of an order's fulfilment this story reads. */
interface FulfilmentLike {
    fulfillmentOrders: { id: string }[];
    shipments: { id: string; trackingCode?: string; status: string }[];
}

/** One audit row, as far as this story reads it. */
interface AuditListLike {
    items: { action: string }[];
}

/**
 * The order's fulfilment as the admin reads it.
 *
 * @param orderId - the order
 */
const fulfilmentOf = (orderId: string): Cypress.Chainable<FulfilmentLike> =>
    cy.apiAs<FulfilmentLike>('admin', 'GET', `/delivery/order/${orderId}`).then((fulfilment) => {
        if (!fulfilment) throw new Error('OP30: the delivery read answered nothing');
        return fulfilment;
    });

describe('OP30 · Ship in part, correct a tracking code', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('cancels, refuses bad quantities, ships one unit, corrects the code and meets a stale dialog', () => {
        cy.subjectId('order.paid').then((orderId) => {
            cy.step('the warehouse starts the order');
            cy.loginAs('warehouse');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=open-ship]').should('exist');

            cy.step('Cancel writes nothing');
            cy.get('[data-test=open-ship]').click();
            cy.get('[data-test=ship-items-dialog]').should('exist');
            cy.get('[data-test=ship-cancel]').click();
            cy.get('[data-test=ship-items-dialog]').should('not.exist');
            fulfilmentOf(orderId).its('shipments').should('have.length', 0);
            cy.apiAs<{ status: string }>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'processing');

            cy.step('too many units, then none at all: the submit stays shut');
            cy.get('[data-test=open-ship]').click();
            cy.get('[data-test^=ship-quantity-] input').clear();
            cy.get('[data-test^=ship-quantity-] input').type('3');
            cy.get('[data-test=ship-lines-invalid]').should('be.visible');
            cy.get('[data-test=ship-submit]').should('be.disabled');
            cy.get('[data-test^=ship-quantity-] input').clear();
            cy.get('[data-test^=ship-quantity-] input').type('0');
            cy.get('[data-test=ship-lines-invalid]').should('be.visible');
            cy.get('[data-test=ship-submit]').should('be.disabled');

            cy.step('one of two units goes out under a typo');
            cy.get('[data-test^=ship-quantity-] input').clear();
            cy.get('[data-test^=ship-quantity-] input').type('1');
            cy.get('[data-test=ship-lines-invalid]').should('not.exist');
            cy.get('[data-test=ship-tracking-code] input').type(TYPO);
            cy.get('[data-test=ship-submit]').should('not.be.disabled').click();
            cy.get('[data-test=ship-items-dialog]').should('not.exist');
            cy.get('[data-test=fulfillment-order-status]').should('contain.text', 'Partly shipped');
            cy.get('[data-test=shipment-row]').should('have.length', 1);
            cy.apiAs<{ fulfillmentStatus: string }>('admin', 'GET', `/orders/${orderId}`)
                .its('fulfillmentStatus')
                .should('equal', 'partially_fulfilled');
            cy.accountOf('user').then(({ email }) => {
                cy.emailTo(
                    email,
                    (mail) =>
                        byTemplate('delivery.shipment-shipped')(mail) &&
                        mailMentions(mail, TYPO) &&
                        mailMentions(mail, 'more items will follow')
                );
            });

            cy.step('the code is corrected: the save button needs a changed value');
            cy.get('[data-test=shipment-tracking-save]').should('be.disabled');
            cy.get('[data-test=shipment-tracking-input] input').clear();
            cy.get('[data-test=shipment-tracking-input] input').type(FIXED);
            cy.get('[data-test=shipment-tracking-save]').should('not.be.disabled').click();
            cy.get('[data-test=shipment-tracking]').should('contain.text', FIXED);
            fulfilmentOf(orderId).its('shipments.0.trackingCode').should('equal', FIXED);
            eventually(
                () =>
                    cy.apiAs<AuditListLike>(
                        'admin',
                        'GET',
                        `/audit?target=${orderId}&pageSize=100`
                    ),
                (list) =>
                    list?.items.some((row) => row.action === 'admin.shipment.tracking_edited') ??
                    false
            );

            cy.step('the dialog goes stale: someone else ships the rest first');
            cy.get('[data-test=open-ship]').click();
            fulfilmentOf(orderId).then((fulfilment) => {
                cy.apiAs(
                    'admin',
                    'POST',
                    `/delivery/fulfillment-orders/${fulfilment.fulfillmentOrders[0]?.id ?? ''}/shipments`,
                    { trackingCode: 'TRK-OP30-B' }
                );
            });
            cy.get('[data-test=ship-submit]').should('not.be.disabled').click();
            cy.get('[data-test=ship-items-error]').should('not.be.empty');
            cy.get('[data-test=ship-items-dialog]').should('exist');
            fulfilmentOf(orderId).its('shipments').should('have.length', 2);
            cy.get('[data-test=ship-cancel]').click();

            cy.step('both parcels are delivered: the tracking control is gone');
            cy.reload();
            cy.get('[data-test=mark-delivered]').should('have.length', 2);
            cy.get('[data-test=mark-delivered]').first().click();
            cy.get('[data-test=mark-delivered]').should('have.length', 1);
            cy.get('[data-test=mark-delivered]').click();
            cy.get('[data-test=mark-delivered]').should('not.exist');
            cy.get('[data-test=shipment-tracking-input]').should('not.exist');
            fulfilmentOf(orderId).then((fulfilment) => {
                loginDevice('warehouse').then((device) => {
                    refusedWith(
                        device,
                        'PATCH',
                        `/delivery/shipments/${fulfilment.shipments[0]?.id ?? ''}`,
                        { trackingCode: 'TRK-LATE' },
                        409
                    );
                });
            });

            cy.step('the buyer’s parcels carry the corrected code, never the typo');
            cy.logout();
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=shipment-tracking]').should('contain.text', FIXED);
            // The timeline keeps what was true when the parcel left, so only the parcels are held.
            cy.get('[data-test=shipment-tracking]').each(($code) => {
                expect($code.text()).to.not.contain(TYPO);
            });
        });
    });
});
