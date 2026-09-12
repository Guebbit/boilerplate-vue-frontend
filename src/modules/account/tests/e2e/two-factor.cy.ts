/**
 * @module
 * End-to-end 2FA login flow: enroll email as a second factor, sign out, sign back in with a code
 * read from the demo backend's email outbox, then remove the factor. `cy.demoEmailTo` and
 * `cy.enrollEmailTwoFactor` only mean something against the demo profile, so every case here opens
 * with `cy.skipUnlessDemo()`, same as `password-reset.cy.ts`.
 */
import { seedAccount } from '../../../../../tests/support/e2e/scenario';

describe('Two-factor authentication', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('enrolls email, challenges the next login, and accepts the mailed code', function () {
        cy.skipUnlessDemo();

        // ── Arm email as a second factor ────────────────────────────────────────────
        cy.loginAs('user');
        cy.enrollEmailTwoFactor(seedAccount('user').email);
        cy.get('[data-test=two-factor-armed]').should('contain.text', 'Email');
        cy.get('[data-test="two-factor-remove-email"]').should('exist');

        // ── The next login stops at the challenge, not straight through ────────────
        cy.logout();
        cy.visit('/en/login');
        cy.get('[type=email]').type(seedAccount('user').email);
        cy.get('[type=password]').type(seedAccount('user').password);
        cy.get('form').submit();
        cy.get('#two-factor-challenge-page').should('exist');
        cy.url().should('include', '/login/2fa');

        // ── Send, read, and submit the mailed code ──────────────────────────────────
        cy.get('[data-test=two-factor-challenge-send]').click();
        // The template is asserted here and only here: it is what pins the login-challenge mail
        // to the right backend template, not something every code read needs to restate.
        cy.demoEmailTo(seedAccount('user').email).then((email) => {
            expect(email.template).to.equal('account.two-factor-code');
        });
        cy.typeMailedTwoFactorCode(
            seedAccount('user').email,
            '[data-test=two-factor-challenge-code]'
        );
        cy.get('[data-test=two-factor-challenge-submit]').click();

        // ── A real session, not just a page change ──────────────────────────────────
        cy.url().should('not.include', '/login');
        cy.get('#home-page').should('exist');
        cy.visit('/en/profile');
        cy.get('#profile-page').should('exist');
    });

    it('a wrong code is refused, and the session never establishes', function () {
        cy.skipUnlessDemo();

        cy.loginAs('user');
        cy.enrollEmailTwoFactor(seedAccount('user').email);
        cy.logout();

        cy.visit('/en/login');
        cy.get('[type=email]').type(seedAccount('user').email);
        cy.get('[type=password]').type(seedAccount('user').password);
        cy.get('form').submit();
        cy.get('#two-factor-challenge-page').should('exist');

        cy.get('[data-test=two-factor-challenge-code]').type('000000');
        cy.get('[data-test=two-factor-challenge-submit]').click();

        // Refused: still on the challenge, never redirected home.
        cy.get('#two-factor-challenge-page').should('exist');
        cy.url().should('include', '/login/2fa');
    });

    it('regenerating backup codes discards the old set and shows a fresh one once', function () {
        cy.skipUnlessDemo();

        // ── Enroll by hand: this case needs one of the backup codes to prove the mutation,
        //    and the shared command dismisses that screen without exposing them. ──────────────
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get('[data-test=two-factor-add-email]').click();
        cy.get('[data-test=two-factor-enroll]').should('be.visible');
        cy.typeMailedTwoFactorCode(seedAccount('user').email, '[data-test=two-factor-enroll-code]');
        cy.get('[data-test=two-factor-enroll-confirm]').click();
        cy.get('[data-test=two-factor-backup-codes]').should('be.visible');

        cy.get('[data-test=backup-codes-list] li')
            .first()
            .invoke('text')
            .then((firstCode) => {
                cy.get('[data-test=backup-codes-confirm-saved]').click();
                cy.get('[data-test=backup-codes-continue]').click();

                // ── Regenerate, proving it with the code just saved ─────────────────────────
                cy.get('[data-test=two-factor-regenerate-codes]').click();
                cy.get('[data-test=app-dialog-confirm]').click();
                cy.get('[data-test=two-factor-code-prompt-input]').type(firstCode.trim());
                cy.get('[data-test=two-factor-code-prompt-submit]').click();

                // ── A fresh set replaces it, shown exactly once ──────────────────────────────
                cy.get('[data-test=two-factor-backup-codes]').should('be.visible');
                cy.get('[data-test=backup-codes-list] li')
                    .first()
                    .invoke('text')
                    .should('not.equal', firstCode);
                cy.get('[data-test=backup-codes-confirm-saved]').click();
                cy.get('[data-test=backup-codes-continue]').click();
                cy.get('[data-test=two-factor-backup-codes]').should('not.exist');
            });
    });

    it('removing the last factor turns 2FA off — the next login goes straight through', function () {
        cy.skipUnlessDemo();

        // ── Enroll by hand, rather than through `cy.enrollEmailTwoFactor()`: this case needs
        //    one of the backup codes, shown once, and the shared command dismisses that screen
        //    without exposing them. ──────────────────────────────────────────────────────────
        cy.loginAs('user');
        cy.visit('/en/profile');
        cy.get('[data-test=two-factor-add-email]').click();
        cy.get('[data-test=two-factor-enroll]').should('be.visible');
        cy.typeMailedTwoFactorCode(seedAccount('user').email, '[data-test=two-factor-enroll-code]');
        cy.get('[data-test=two-factor-enroll-confirm]').click();
        cy.get('[data-test=two-factor-backup-codes]').should('be.visible');

        // Read one code back before it is gone forever, then finish the enrollment.
        cy.get('[data-test=backup-codes-list] li')
            .first()
            .invoke('text')
            .then((backupCode) => {
                cy.get('[data-test=backup-codes-confirm-saved]').click();
                cy.get('[data-test=backup-codes-continue]').click();

                // ── Remove the only armed factor, proving it with the backup code ──────────
                cy.get('[data-test="two-factor-remove-email"]').click();
                cy.get('[data-test=app-dialog-confirm]').click();
                cy.get('[data-test=two-factor-code-prompt-input]').type(backupCode.trim());
                cy.get('[data-test=two-factor-code-prompt-submit]').click();
            });
        cy.get('[data-test=two-factor-armed]').should('not.exist');

        // ── The next login goes straight through — no challenge left to answer ─────────────
        cy.logout();
        cy.visit('/en/login');
        cy.get('[type=email]').type(seedAccount('user').email);
        cy.get('[type=password]').type(seedAccount('user').password);
        cy.get('form').submit();
        cy.url().should('not.include', '/login');
        cy.get('#home-page').should('exist');
    });
});
