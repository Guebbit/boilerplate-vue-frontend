// requires-module: account, delivery, orders
/**
 * @module
 * FR18 · A warehouse shift by keyboard only. The warehouse signs in with Tab, typing and Enter, opens
 * a paid express order, starts it, opens the ship dialog, types the tracking code, changes their
 * mind with Escape (focus is back on the button and nothing shipped), opens it again and submits
 * with Enter, then marks it delivered. No spec step clicks anything; the order ends delivered.
 */

/** The tracking code the express parcel needs. */
const TRACKING_CODE = 'FR18-TRACK-001';

/** The order's status as the owner reads it through the API. */
interface OrderStatus {
    status: string;
    fulfillmentStatus?: string;
}

/**
 * Focuses a control by its `data-test` and presses Enter on it, the way a keyboard user activates it.
 *
 * @param selector - the control's `data-test` selector
 */
const activate = (selector: string): void => {
    cy.get(selector).should('not.be.disabled').focus();
    cy.focused().should('match', selector);
    cy.realPress('Enter');
};

describe('FR18 · A warehouse shift by keyboard only', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('signs in, starts, ships with a code, backs out once, and delivers, with no pointer', () => {
        cy.step('the warehouse signs in with Tab, typing and Enter');
        cy.visit('/en/login');
        cy.accountOf('warehouse').then(({ email, password, totpSecret }) => {
            cy.get('[type=email]').should('not.be.disabled').focus();
            cy.realType(email);
            cy.realPress('Tab');
            cy.realType(password);
            cy.realPress('Enter');

            // A staff account answers its authenticator code next, typed and sent by keys too.
            cy.get('#two-factor-challenge-page').should('exist');
            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.task<string>('loginTotpCode', {
                    secret: String(totpSecret),
                    apiUrl: String(apiUrl)
                }).then((code) => {
                    cy.get('[data-test=two-factor-challenge-code] input').focus();
                    cy.realType(code);
                    cy.realPress('Enter');
                });
            });
        });
        cy.get('[data-test=admin-menu]').should('exist');

        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);

            cy.step('Enter on start moves the order on');
            activate('[data-test=mark-started]');
            cy.get('[data-test=mark-started]').should('not.exist');

            cy.step(
                'the ship dialog takes focus; Escape backs out, focus returns, nothing shipped'
            );
            activate('[data-test=open-ship]');
            cy.get('[data-test=ship-submit]').should('be.visible');
            cy.focused().closest('.v-overlay--active').should('exist');
            cy.focused().realType(TRACKING_CODE);
            cy.realPress('Escape');
            cy.get('[data-test=ship-submit]').should('not.exist');
            cy.focused().should('match', '[data-test=open-ship]');
            cy.apiAs<OrderStatus>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('not.equal', 'shipped');

            cy.step('reopened, the code typed and Enter ships it');
            activate('[data-test=open-ship]');
            cy.get('[data-test=ship-tracking-code] input').focus();
            cy.realType(TRACKING_CODE);
            cy.realPress('Enter');
            cy.get('[data-test=shipment-tracking]').should('contain.text', TRACKING_CODE);

            cy.step('Enter on delivered finishes the shift');
            activate('[data-test=mark-delivered]');
            cy.get('[data-test=mark-delivered]').should('not.exist');
            cy.apiAs<OrderStatus>('admin', 'GET', `/orders/${orderId}`)
                .its('status')
                .should('equal', 'delivered');
        });
    });
});
