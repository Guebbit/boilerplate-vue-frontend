// requires-module: none
/**
 * @module
 * The antibot run's own backend: the human-challenge provider is on, which is what every
 * `*.antibot.cy.ts` spec relies on. The functional run never sees it (`ANTIBOT_SPEC_GLOBS`), so
 * this spec is the proof that the shard/matrix entry really boots the provider — without it a
 * mis-wired run would pass every antibot journey's "provider is off" branch silently.
 */

describe('The antibot run', () => {
    beforeEach(() => {
        cy.visit('/en');
    });

    it('boots a backend whose human-challenge provider is altcha, and serves its challenge', () => {
        cy.env(['apiUrl']).then(({ apiUrl }) => {
            cy.request(`${String(apiUrl)}/antibot/config`)
                .its('body.data.provider')
                .should('equal', 'altcha');

            cy.request(`${String(apiUrl)}/antibot/challenge`)
                .its('status')
                .should('equal', 200);
        });
    });
});
