// requires-module: account, delivery, orders, returns
/**
 * @module
 * FR19 · A double press on money. A finger that presses a destructive or money-moving control
 * twice, fast, on a slow connection, must cause one effect: one cancellation, one withdrawal, one
 * shipment. Each case holds every write's answer back 1.5 s, so "in flight" is something the
 * browser can be asked about, then `.dblclick()`s the control (synthetic and synchronous, the
 * strictest form, as FR1 does) and the confirmation that follows it.
 *
 * What is asserted, per case: no more than one confirmation dialog is ever up at once, the write
 * went out once (the control is disabled while it is in flight), nothing shows an error, and the
 * order, read through the API, shows a single effect.
 *
 * Money moves without a card here, so no provider budget is spent.
 */
import { eventually } from '../../../support/e2e/steps';

/** How long each write's answer is held back, so the in-flight state lasts long enough to see. */
const WRITE_DELAY_MS = 1500;

/** The tracking code the warehouse types. */
const TRACKING_CODE = 'FR19-TRACK-001';

/** What the specs read of an order. */
interface OrderState {
    id: string;
    status: string;
}

/**
 * The order as the API serves it to one persona.
 *
 * @param role - who asks
 * @param orderId - which order
 * @returns a chain yielding its state
 */
const orderNow = (role: 'user' | 'warehouse', orderId: string): Cypress.Chainable<OrderState> =>
    cy.apiAs<OrderState>(role, 'GET', `/orders/${orderId}`).then((order) => {
        if (!order) throw new Error(`orderNow: no order ${orderId}`);
        return order;
    });

/**
 * Holds every write the page makes for 1.5 s and records them, so a case can count what was sent.
 * A `POST` search is a read and is not counted.
 *
 * @returns the list the writes are pushed into
 */
const holdAndRecordWrites = (): string[] => {
    const writes: string[] = [];
    cy.env(['apiUrl']).then(({ apiUrl }) => {
        cy.intercept(
            { method: /^(POST|PUT|PATCH|DELETE)$/, url: `${String(apiUrl)}/**` },
            (request) => {
                if (!/\/search(\?|$)/.test(request.url))
                    writes.push(`${request.method} ${request.url}`);
                request.on('response', (response) => {
                    response.setDelay(WRITE_DELAY_MS);
                });
            }
        );
    });
    return writes;
};

/**
 * Presses a control twice at once, then the confirmation it raises twice at once, and asserts
 * the dialog never doubled.
 *
 * @param trigger - the control's selector
 */
const pressTwiceAndConfirmTwice = (trigger: string): void => {
    cy.get(trigger).should('not.be.disabled').dblclick();
    cy.get('[data-test=app-dialog-confirm]').should('be.visible');
    cy.get('body').then(($body) => {
        expect(
            $body.find('[data-test=app-dialog]:visible').length,
            'confirmation dialogs open at once'
        ).to.be.at.most(1);
    });
    cy.get('[data-test=app-dialog-confirm]').dblclick();
    // Answered once, the dialog closes and no second one takes its place.
    cy.get('[data-test=app-dialog-confirm]').should('not.exist');
};

describe('FR19 · A double press on money', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('a customer who double-presses cancel on a paid order cancels it once', () => {
        cy.loginAs('user');
        cy.subjectId('order.paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-cancel]').should('exist');

            cy.step('every write is slow, and cancel and its confirmation are pressed twice');
            const writes = holdAndRecordWrites();
            pressTwiceAndConfirmTwice('[data-test=order-cancel]');

            cy.step('the order is cancelled once, with no error on the page');
            eventually(
                () => orderNow('user', orderId),
                (order) => order.status === 'cancelled'
            );
            cy.get('[data-test=order-cancel-error]').should('not.exist');
            cy.then(() => {
                expect(writes, `the writes the page sent: ${writes.join(' | ')}`).to.have.length(1);
            });
        });
    });

    it('a customer who double-presses withdraw on a paid order withdraws once', () => {
        cy.loginAs('user');
        cy.subjectId('order.paid').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=withdraw-button]').should('not.be.disabled');

            cy.step('every write is slow, and withdraw and its confirmation are pressed twice');
            const writes = holdAndRecordWrites();
            pressTwiceAndConfirmTwice('[data-test=withdraw-button]');

            cy.step('the order is cancelled once, with no error on the page');
            eventually(
                () => orderNow('user', orderId),
                (order) => order.status === 'cancelled'
            );
            cy.get('[data-test=withdraw-error]').should('not.exist');
            cy.then(() => {
                expect(writes, `the writes the page sent: ${writes.join(' | ')}`).to.have.length(1);
            });
        });
    });

    it('a warehouse member who double-presses ship ships the order once', () => {
        cy.loginAs('warehouse');
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=open-ship]').should('exist').click();
            cy.get('[data-test=ship-submit]').should('be.visible');
            cy.get('[data-test=ship-tracking-code] input').type(TRACKING_CODE);

            cy.step('every write is slow, and the ship button is pressed twice');
            const writes = holdAndRecordWrites();
            cy.get('[data-test=ship-submit]').dblclick();

            cy.step('one shipment lands, and the dialog is gone');
            cy.get('[data-test=ship-submit]').should('not.exist');
            cy.get('[data-test=shipment-tracking]').should('have.length', 1);
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);
            cy.then(() => {
                expect(writes, `the writes the page sent: ${writes.join(' | ')}`).to.have.length(1);
            });
        });
    });
});
