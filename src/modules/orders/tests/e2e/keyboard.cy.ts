/**
 * @module
 * The keyboard pattern of the dialogs the order page hosts for the delivery module (WAI-ARIA Dialog, modal): focus moves in
 * on open, Tab stays inside, Escape closes without writing, and focus returns to the opener. The
 * warehouse is the account that works these dialogs.
 */
import { expectDialogKeyboardPattern } from '../../../../../tests/support/e2e/dialog-keyboard';

describe('order-page delivery dialogs by keyboard', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('warehouse');
    });

    it('the ship dialog traps Tab, closes on Escape and hands focus back', () => {
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=mark-started]').click();
            cy.get('[data-test=open-ship]').should('exist');
            expectDialogKeyboardPattern('[data-test=open-ship]', '[data-test=ship-submit]');
        });
    });

    it('the hold dialog traps Tab, closes on Escape and hands focus back', () => {
        cy.subjectId('order.paidExpress').then((orderId) => {
            cy.visit(`/en/orders/${orderId}`);
            expectDialogKeyboardPattern('[data-test=open-hold]', '[data-test=hold-dialog]');
        });
    });
});
