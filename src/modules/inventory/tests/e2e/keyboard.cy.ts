/**
 * @module
 * The keyboard pattern of the stock board's preorder-allowance dialog (WAI-ARIA Dialog, modal):
 * focus moves in on open, Tab stays inside, Escape closes without writing, and focus returns to
 * the button that opened it. The warehouse is the account that sets allowances.
 */
import { expectDialogKeyboardPattern } from '../../../../../tests/support/e2e/dialog-keyboard';

describe('inventory dialogs by keyboard', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('warehouse');
    });

    it('the allowance dialog traps Tab, closes on Escape and hands focus back', () => {
        cy.visit('/en/inventory');
        cy.get('[data-test=level-row]').should('exist');
        // The first row's own button: a native selector, because the helper also asks the
        // document whether the opener survived the dialog.
        expectDialogKeyboardPattern(
            'tbody tr:nth-child(1) [data-test=level-backorder-limit]',
            '[data-test=backorder-limit-dialog]'
        );
    });
});
