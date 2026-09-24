/**
 * @module
 * The live observability stream, end to end: a real `EventSource` on the operator's session
 * cookie, frames validated against the AsyncAPI contract (the e2e build turns
 * `VITE_VALIDATE_RESPONSES` on), rendered by the playground.
 *
 * Two server events are asserted, each one the SERVER chose to send: the snapshot it pushes the
 * moment the stream opens, and a periodic update that has to carry traffic this spec caused
 * after connecting — so a stuck or replayed payload cannot pass for a live one.
 */
describe('Realtime observability stream', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    it('renders the connect snapshot, then an update counting traffic sent since', () => {
        cy.loginAs('admin');
        cy.visit('/en/playground/realtime');

        cy.get('[data-test=realtime-connect]').click();
        cy.get('[data-test=realtime-status]').should('contain.text', 'open');
        cy.get('[data-test=realtime-feed-summary]').should('contain.text', 'snapshot');

        // The number the snapshot showed, before this spec sends anything.
        cy.get('[data-test=realtime-requests] .text-3xl')
            .invoke('text')
            .then((text) => {
                const before = Number(text.trim());
                const TRAFFIC = 5;

                // Requests the backend's own counter must see — public reads, no session needed.
                cy.env(['apiUrl']).then(({ apiUrl }) => {
                    for (let index = 0; index < TRAFFIC; index++)
                        cy.request(`${String(apiUrl)}/products`);
                });

                // The server pushes `metrics.updated` every 5s; allow a few ticks under load.
                cy.get('[data-test=realtime-requests] .text-3xl', { timeout: 20_000 }).should(
                    ($value) => {
                        expect(Number($value.text().trim())).to.be.at.least(before + TRAFFIC);
                    }
                );
                cy.get('[data-test=realtime-feed-summary]').should('not.contain.text', 'snapshot');
            });
    });
});
