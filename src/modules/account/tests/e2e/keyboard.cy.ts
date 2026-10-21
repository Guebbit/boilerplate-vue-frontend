/**
 * @module
 * The keyboard behaviour of the account's three persistent two-factor dialogs: enrolling a
 * factor, the one-time backup codes, and the code prompt that guards removing a factor.
 *
 * They are the one dialog kind where Escape must NOT close (dismissing would lose a half-made
 * enrolment or the only sight of the codes), so this is not `expectDialogKeyboardPattern`: it
 * asserts the dialog survives Escape, keeps focus inside, and makes no write. A persistent dialog
 * closes through its own buttons, which the account's other specs press.
 */
import { seedAccount } from '../../../../../tests/support/e2e/scenario';

/** The element Vuetify gives every open dialog: Tab must never leave it. */
const ACTIVE_OVERLAY = '.v-overlay--active';

/**
 * Asserts a persistent dialog ignores Escape and holds focus.
 *
 * @param dialog - selector of the dialog's content once open
 */
const expectEscapeLeavesItOpen = (dialog: string): void => {
    cy.get(dialog).should('be.visible');
    cy.realPress('Escape');
    cy.get(dialog).should('be.visible');
    cy.realPress('Tab');
    cy.focused().closest(ACTIVE_OVERLAY).should('exist');
    cy.realPress(['Shift', 'Tab']);
    cy.focused().closest(ACTIVE_OVERLAY).should('exist');
};

describe('two-factor dialogs by keyboard', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('enrol, backup codes and code prompt stay open on Escape and keep focus inside', function () {
        cy.skipUnlessMailbox();
        cy.loginAs('user');
        const { email } = seedAccount('user');

        cy.step('the enrolment dialog ignores Escape');
        cy.visit('/en/profile');
        cy.get('[data-test=two-factor-add-email]').click();
        expectEscapeLeavesItOpen('[data-test=two-factor-enroll]');

        cy.step('the backup-codes dialog ignores Escape, and only its own buttons close it');
        cy.typeMailedTwoFactorCode(email, '[data-test=two-factor-enroll-code]');
        cy.get('[data-test=two-factor-enroll-confirm]').click();
        expectEscapeLeavesItOpen('[data-test=two-factor-backup-codes]');
        cy.get('[data-test=backup-codes-confirm-saved]').click();
        cy.get('[data-test=backup-codes-continue]').click();
        cy.get('[data-test=two-factor-backup-codes]').should('not.exist');

        cy.step('the code prompt ignores Escape');
        cy.get('[data-test=two-factor-remove-email]').click();
        expectEscapeLeavesItOpen(`${ACTIVE_OVERLAY} [data-test=two-factor-code-prompt-input]`);
    });
});
