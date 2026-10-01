// requires-module: account
/**
 * @module
 * AC1 · I lost my phone. A customer whose second factor is out of reach signs in with a backup
 * code. Each code works once and only once; regenerating the set kills every code of the old
 * one, used or not, and the new ones sign in.
 *
 * Starts from the seeded `twoFactor` persona, which arrives with email 2FA armed and five known
 * backup codes, so no mail is read. Runs on both profiles.
 */
import {
    dismissBackupCodes,
    loginToChallenge,
    revealedBackupCodes,
    submitBackupCode
} from '../../../support/e2e/security-steps';

/** The persona's login, as `cy.accountOf` yields it. */
interface Persona {
    email: string;
    password: string;
    backupCodes?: string[];
}

/**
 * The persona's published codes; the journey needs at least four of the five.
 *
 * @param account - what `cy.accountOf('twoFactor')` yielded
 */
const codesOf = (account: Persona): string[] => {
    expect(account.backupCodes, 'the seeded backup codes').to.have.length.of.at.least(4);
    return account.backupCodes ?? [];
};

describe('AC1 · I lost my phone: backup codes', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('a backup code works once, and regenerating the set kills the old codes', () => {
        cy.accountOf('twoFactor').then((account) => {
            const [first, second, third, fourth] = codesOf(account);

            cy.step('a password alone is not enough: the challenge stops the login');
            loginToChallenge(account);

            cy.step('the first backup code lets me in');
            submitBackupCode(first);
            cy.get('#home-page').should('exist');
            cy.get('[data-test=user-menu]').should('exist');

            cy.step('the same code a second time is refused, and I stay on the challenge');
            cy.logout();
            loginToChallenge(account);
            submitBackupCode(first);
            cy.get('[data-test=two-factor-challenge-submit-error]').should('not.be.empty');
            cy.get('#two-factor-challenge-page').should('exist');

            cy.step('a different code still works: a used code burns itself, not the account');
            submitBackupCode(second);
            cy.get('#home-page').should('exist');

            cy.step('regenerating the codes, proved with one more of the old ones');
            cy.visit('/en/profile');
            cy.get('[data-test=two-factor-regenerate-codes]').click();
            cy.get('[data-test=app-dialog-confirm]').click();
            cy.get('[data-test=two-factor-code-prompt-input] input').type(third);
            cy.get('[data-test=two-factor-code-prompt-submit]').click();
            cy.get('[data-test=two-factor-backup-codes]').should('be.visible');
            revealedBackupCodes().then((fresh) => {
                expect(fresh, 'a fresh set').to.have.length.of.at.least(1);
                expect(fresh, 'none of them an old code').to.not.include.members([
                    first,
                    second,
                    third,
                    fourth
                ]);
                dismissBackupCodes();

                cy.step('an old code that was never used is dead too');
                cy.logout();
                loginToChallenge(account);
                submitBackupCode(fourth);
                cy.get('[data-test=two-factor-challenge-submit-error]').should('not.be.empty');
                cy.get('#two-factor-challenge-page').should('exist');

                cy.step('a new code signs in');
                submitBackupCode(fresh[0]);
                cy.get('#home-page').should('exist');
            });
        });
    });
});
