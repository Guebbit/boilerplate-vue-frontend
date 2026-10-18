/**
 * @module
 * The keyboard pattern of the users module's access dialog (WAI-ARIA Dialog, modal): focus moves
 * in on open, Tab stays inside, Escape closes without writing, and focus returns to the opener.
 */
import { expectDialogKeyboardPattern } from '../../../../../tests/support/e2e/dialog-keyboard';

describe('users dialogs by keyboard', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.loginAs('admin');
    });

    it('the manage-access dialog traps Tab, closes on Escape and hands focus back', () => {
        cy.accountInRole('user').then((account) => {
            cy.visit(`/en/users/${account.id}`);
            expectDialogKeyboardPattern(
                '[data-test=user-manage-access]',
                '[data-test=user-access-dialog]'
            );
        });
    });
});
