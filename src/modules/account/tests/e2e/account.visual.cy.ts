/**
 * @module
 * Screen list for this module's own visual-regression sweep — the mechanism lives in
 * `tests/support/e2e/visual-sweep.ts`; this file only names the screen(s) to snapshot.
 *
 * Baselines live in `__snapshots__/` beside this file, so deleting the module deletes its
 * photographs too. Not part of `npm run complete`: run with `npm run test:e2e:visual`, and
 * re-record with `npm run test:e2e:visual:update` only after LOOKING at the diff image.
 */
import { sweepVisual } from '../../../../../tests/support/e2e/visual-sweep';
import { E2E_ACCOUNTS } from '../../../../../tests/support/e2e/accounts';

sweepVisual('account', [['login', '/en/login', '#login-page']]);

sweepVisual(
    'account — signed in',
    [
        // Off by default — the 2FA panel in its ordinary, nothing-armed state.
        ['profile, 2FA panel off', '/en/profile', '#profile-page'],
        {
            // Reached through a real enrollment, not `cy.visit` — the code comes from the demo
            // outbox, and the backup codes only exist once the confirm call has actually armed
            // the method. `cy.skipUnlessDemo()` inside `prepare` narrows this ONE case to the
            // demo profile without touching the rest of the sweep.
            name: 'profile, 2FA backup codes',
            route: '/en/profile',
            readySelector: '#profile-page',
            prepare: () => {
                cy.skipUnlessDemo();
                cy.get('[data-test=two-factor-add-email]').click();
                cy.get('[data-test=two-factor-enroll]').should('be.visible');
                cy.demoEmailTo(E2E_ACCOUNTS.user.email).then((sent) => {
                    const codeLine = sent.lines?.find((line) => line.startsWith('code: '));
                    cy.get('[data-test=two-factor-enroll-code]').type(
                        codeLine!.slice('code: '.length)
                    );
                });
                cy.get('[data-test=two-factor-enroll-confirm]').click();
                cy.get('[data-test=two-factor-backup-codes]').should('be.visible');
            }
        }
    ],
    'user'
);

sweepVisual(
    'account — 2FA login challenge',
    [
        {
            // Same reasoning as the a11y sweep's equivalent case: the challenge is claim-check
            // state the Pinia store holds in memory, unreachable by `cy.visit` alone.
            name: 'login, 2FA challenge',
            route: '/en/login',
            readySelector: '#login-page',
            prepare: () => {
                cy.skipUnlessDemo();
                cy.loginAs('user');
                cy.enrollEmailTwoFactor(E2E_ACCOUNTS.user.email);
                cy.logout();
                cy.visit('/en/login');
                cy.get('[type=email]').type(E2E_ACCOUNTS.user.email);
                cy.get('[type=password]').type(E2E_ACCOUNTS.user.password);
                cy.get('form').submit();
                cy.get('#two-factor-challenge-page').should('exist');
            }
        }
    ]
    // Signed out at the start — the whole point of the challenge screen.
);
