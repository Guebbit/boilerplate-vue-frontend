// requires-module: account, orders
/**
 * @module
 * OP42 · A wrong note is withdrawn. Staff write a private note from the order's history: the buyer's
 * timeline carries no such row, on the page or in the API. Staff then remove the note's text from
 * the same row: the row stays, to show a note was written, and no longer shows what it said (nor
 * the button). The buyer's timeline is still without it.
 */

/** What staff write: it must never reach the buyer's page. */
const NOTE = 'Buyer asked us to hold it until Friday';

/** The slice of a timeline entry this story reads. */
interface EntryLike {
    type: string;
    text?: string;
}

/** The staff-only row type this story watches for. */
const NOTE_ROW = '[data-test=order-timeline-entry][data-type=note_added]';

describe('OP42 · A wrong note is withdrawn', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('staff write a note the buyer never sees, then remove its text and the row keeps no text', () => {
        cy.subjectId('order.paid').then((orderId) => {
            cy.step('the admin writes a note from the order history');
            cy.loginAs('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-timeline-note-text] textarea').type(NOTE);
            cy.get('[data-test=order-timeline-note-submit]').click();
            cy.get(NOTE_ROW).should('have.length', 1);
            cy.get(NOTE_ROW).find('[data-test=order-timeline-text]').should('contain.text', NOTE);

            cy.step('the buyer reads the order: no note row on the page, none in the API');
            cy.switchUser('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=order-timeline-entry][data-type=created]').should('exist');
            cy.get(NOTE_ROW).should('not.exist');
            cy.contains(NOTE).should('not.exist');
            cy.apiAs<{ items: EntryLike[] }>('user', 'GET', `/orders/${orderId}/timeline`)
                .its('items')
                .should((entries: EntryLike[]) => {
                    expect(entries.length, 'the buyer reads a timeline').to.be.greaterThan(0);
                    expect(entries.map(({ type }) => type)).to.not.include('note_added');
                });

            cy.step('the admin removes the text: the row stays, with no text and no button');
            cy.switchUser('admin');
            cy.visit(`/en/orders/${orderId}`);
            cy.get(NOTE_ROW).find('[data-test=order-timeline-note-remove]').click();
            cy.get(NOTE_ROW).should('have.length', 1);
            cy.get(NOTE_ROW).find('[data-test=order-timeline-text]').should('not.exist');
            cy.get(NOTE_ROW).find('[data-test=order-timeline-note-remove]').should('not.exist');
            cy.contains(NOTE).should('not.exist');

            cy.step('the API agrees: the row has no text');
            cy.apiAs<{ items: EntryLike[] }>('admin', 'GET', `/orders/${orderId}/timeline`)
                .its('items')
                .should((entries: EntryLike[]) => {
                    const note = entries.find(({ type }) => type === 'note_added');
                    expect(note, 'the row stays').to.not.equal(undefined);
                    expect(note, 'the text is gone').to.not.have.property('text');
                });

            cy.step('the buyer still sees no note');
            cy.switchUser('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get(NOTE_ROW).should('not.exist');
        });
    });
});
