/**
 * Positive control for the global `[contract]` hook (`tests/support/e2e/commands.ts`).
 *
 * A hook that never fires looks exactly like a suite with no drift, so this plants a
 * contract-mismatch line on the page's `console.error` and requires the running test to FAIL
 * on it. The failure is caught here and turned into the pass.
 */
describe('Contract hook', () => {
    it('fails the running test when the page logs a contract mismatch', (done) => {
        cy.visit('/en');

        // The page's own `setTimeout` throws, which Cypress reports as an uncaught exception
        // rather than a failed command: both doors lead to the same check (as in layout-checks).
        const expectContractFailure = (error: Error) => {
            expect(error.message).to.contain('[contract]');
            done();
            return false;
        };
        cy.on('fail', expectContractFailure);
        cy.on('uncaught:exception', expectContractFailure);

        // The promise resolves from a page timer queued after the hook's own, so the deferred
        // throw has already run when it settles; reaching the `cy.then` below means it never did.
        cy.window().then(
            (win) =>
                new Cypress.Promise<void>((resolve) => {
                    win.console.error('[contract] X does not match the schema');
                    win.setTimeout(resolve, 500);
                })
        );
        cy.then(() => {
            done(new Error('the hook let a [contract] mismatch on console.error pass'));
        });
    });
});
