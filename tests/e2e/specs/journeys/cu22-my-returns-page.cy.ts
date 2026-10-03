// requires-module: account, orders, returns
/**
 * @module
 * CU22 · My returns page tells me where each one stands. A customer has three returns in three
 * different places: a defective item that support declined with a reason, a defective item nobody has
 * answered yet, and a withdrawal that came back and was refunded less a handling deduction. The
 * returns page lists all three; its two filters narrow it, each to exactly the returns they should and
 * to the empty state when nothing fits; each return opens to its own story (the reason it was declined,
 * the refund and the deduction) with the same lines and prices as the order; and each links back to an
 * order that in turn shows the return.
 *
 * The customer can only OPEN a whole-order withdrawal through the UI, so that one is opened the way a
 * customer does. The two defective requests are seeded; support and the warehouse answer them through
 * the API, since what they do is not what this story is about.
 */
import { centsOf, cents } from '../../../support/e2e/steps';

/** The reason support gives for declining, which the customer must be able to read. */
const DECLINE_REASON = 'The photos show ordinary wear, not a fault.';

/** What the warehouse keeps back from the withdrawal's refund, in major units and in cents. */
const DEDUCTION = 3;

/** The handling deduction in cents, the unit the page's money cells read in. */
const DEDUCTION_CENTS = DEDUCTION * 100;

/** The slice of a return this story reads. */
interface ReturnLike {
    id: string;
    orderId: string;
    status: string;
    lines: { title: string; quantity: number; unitPrice: number }[];
}

/** The slice of an order this story reads: its lines, for the return to agree with. */
interface OrderLike {
    items: { quantity: number; product: { title: string; price: number } }[];
}

/** The slice of a payment this story reads: what was taken. */
interface PaymentLike {
    amount: number;
}

/**
 * Narrows the returns list with one filter, through the filter's own select and the search button.
 *
 * @param filter - which filter, `status` or `reason`
 * @param label - the option's visible name
 */
const filterReturnsBy = (filter: 'status' | 'reason', label: string): void => {
    cy.pickOption(`[data-test=filter-${filter}]`, label);
    cy.get('[data-test=search-submit]').click();
};

/**
 * Asserts which returns the list shows, by the address each row opens — never by position.
 *
 * @param ids - the returns expected, and only those
 */
const listShows = (ids: string[]): void => {
    cy.get('[data-test=return-open]').should('have.length', ids.length);
    for (const id of ids) cy.get(`[data-test=return-open][href$="/returns/${id}"]`).should('exist');
};

/**
 * Asserts a return's page shows the same lines and prices as its order: the same titles, the same
 * quantities, each line's price as the order priced it.
 *
 * @param returnId - the return open on screen
 */
const linesMatchTheOrder = (returnId: string): void => {
    cy.apiAs<ReturnLike>('user', 'GET', `/returns/${returnId}`).then((opened) => {
        cy.apiAs<OrderLike>('user', 'GET', `/orders/${String(opened?.orderId)}`).then((order) => {
            const lines = opened?.lines ?? [];
            cy.get('[data-test=return-line]').should('have.length', lines.length);
            for (const line of lines) {
                const onOrder = order?.items.find((item) => item.product.title === line.title);
                expect(onOrder, `"${line.title}" is on the order`).to.not.equal(undefined);
                expect(line.unitPrice, 'the price the order charged').to.equal(
                    onOrder?.product.price
                );
                cy.contains('[data-test=return-line]', line.title).should(
                    'contain.text',
                    `× ${String(line.quantity)}`
                );
            }
        });
    });
};

describe('CU22 · My returns page tells me where each one stands', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('lists, filters and opens each return, and each one links back to an order that shows it', () => {
        cy.subjectId('return.requested').then((declinedId) => {
            cy.subjectId('return.requestedSecond').then((waitingId) => {
                cy.subjectId('order.deliveredRecent').then((orderId) => {
                    cy.step('support declines one request, with a reason the customer will read');
                    cy.apiAs('support', 'POST', `/returns/${declinedId}/decline`, {
                        reason: DECLINE_REASON
                    });

                    cy.step(
                        'the customer withdraws from a delivered order, and the warehouse takes it back'
                    );
                    cy.loginAs('user');
                    cy.visit(`/en/orders/${orderId}`);
                    cy.get('[data-test=withdraw-button]').click();
                    cy.get('[data-test=app-dialog-confirm]').click();
                    cy.get('[data-test=order-return]').should('have.length', 1);
                    const opened = { id: '', paid: 0 };
                    cy.get('[data-test=order-return] a')
                        .invoke('attr', 'href')
                        .then((href) => {
                            opened.id = String(href).split('/').at(-1) ?? '';
                        });
                    cy.apiAs<PaymentLike>('user', 'GET', `/payments/order/${orderId}`).then(
                        (payment) => {
                            opened.paid = Math.round(Number(payment?.amount) * 100);
                        }
                    );
                    cy.then(() =>
                        cy.apiAs('warehouse', 'POST', `/returns/${opened.id}/receive`, {
                            handlingDeduction: DEDUCTION
                        })
                    );

                    cy.step('the list holds all three, each with its own status');
                    cy.visit('/en/returns');
                    cy.then(() => {
                        listShows([declinedId, waitingId, opened.id]);
                    });
                    cy.get('[data-test=return-item]').should('have.length', 3);

                    cy.step('the status filter narrows to exactly the returns in that state');
                    filterReturnsBy('status', 'Declined');
                    listShows([declinedId]);
                    filterReturnsBy('status', 'Requested');
                    listShows([waitingId]);
                    filterReturnsBy('status', 'Approved');
                    cy.get('[data-test=return-item]').should('not.exist');
                    cy.get('#returns-list-page .v-empty-state').should('exist');

                    cy.step('the reason filter narrows the same way, and the two combine');
                    filterReturnsBy('status', 'Any status');
                    filterReturnsBy('reason', 'Withdrawal');
                    cy.then(() => {
                        listShows([opened.id]);
                    });
                    filterReturnsBy('reason', 'Defective');
                    listShows([declinedId, waitingId]);
                    filterReturnsBy('status', 'Declined');
                    filterReturnsBy('reason', 'Withdrawal');
                    cy.get('[data-test=return-item]').should('not.exist');
                    cy.get('[data-test=search-reset]').click();
                    cy.get('[data-test=return-item]').should('have.length', 3);

                    cy.step('the declined return says why, and is not the customer to act on');
                    cy.get(`[data-test=return-open][href$="/returns/${declinedId}"]`).click();
                    cy.get('#return-target').should('exist');
                    cy.get('[data-test=return-decline-reason-text]').should(
                        'contain.text',
                        DECLINE_REASON
                    );
                    cy.get('[data-test=return-approve]').should('not.exist');
                    cy.get('[data-test=return-receive]').should('not.exist');
                    linesMatchTheOrder(declinedId);
                    cy.checkPageA11y('a declined return');

                    cy.step('the one nobody has answered shows no decision and no money');
                    cy.visit(`/en/returns/${waitingId}`);
                    cy.get('[data-test=return-status]').should('exist');
                    cy.get('[data-test=return-decline-reason-text]').should('not.exist');
                    cy.get('[data-test=return-refund]').should('not.exist');
                    linesMatchTheOrder(waitingId);

                    cy.step(
                        'the received withdrawal shows the deduction and the refund that follows'
                    );
                    // `opened.id` is read when the queue reaches it, not when it was built.
                    cy.then(() => cy.visit(`/en/returns/${opened.id}`));
                    centsOf('[data-test=return-deduction]').should('equal', DEDUCTION_CENTS);
                    cy.get('[data-test=return-refund]')
                        .invoke('text')
                        .should((shown) => {
                            expect(cents(shown)).to.equal(opened.paid - DEDUCTION_CENTS);
                        });
                    cy.then(() => {
                        linesMatchTheOrder(opened.id);
                    });

                    cy.step('each return links back to an order that shows the return');
                    cy.get('[data-test=return-order-link]').click();
                    cy.get('#order-target').should('exist');
                    cy.location('pathname').should('equal', `/en/orders/${orderId}`);
                    cy.get('[data-test=order-return-status]').should('exist');
                    cy.get('[data-test=order-return]').should('have.length', 1);
                    cy.get('[data-test=order-return] a').click();
                    cy.then(() =>
                        cy.location('pathname').should('equal', `/en/returns/${opened.id}`)
                    );
                });
            });
        });
    });
});
