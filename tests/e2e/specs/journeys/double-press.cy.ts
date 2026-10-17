// requires-module: orders, payments, returns
/**
 * @module
 * FR19 · A double press on a money button. Each row presses one control that moves money or
 * stock twice in a row, fast: a synthetic `dblclick` is synchronous, the strictest form. A
 * confirmation that follows is pressed twice too. The rows assert what a person is owed:
 * at most one confirmation dialog at a time, no second one after the answer, the operation
 * requested once (or, if twice, under one `Idempotency-Key`), exactly one effect on the server,
 * and no error alert.
 */

/** One control to double press. */
interface PressRow {
    /** What the row says when it fails. */
    name: string;
    /** Who is signed in. */
    persona: 'user' | 'admin';
    /** The subject whose order page is opened. */
    subject: string;
    /** The page to open for the order id. */
    page: (orderId: string) => string;
    /** The control to press. */
    trigger: string;
    /** A `cy.intercept` pattern for the operation's request. */
    operation: string;
    /** Whether a confirmation dialog follows the press. */
    confirms: boolean;
    /** Reads the effect the server must show exactly once. */
    effect: (orderId: string) => Cypress.Chainable<string>;
    /** What `effect` must read once the press has taken. */
    done: string;
}

/** The slice of an order the effect reads. */
interface OrderStatus {
    status: string;
}

/**
 * The order's status as the owner reads it through the API.
 *
 * @param persona - whose view
 * @param orderId - the order
 */
const statusOf = (persona: 'user' | 'admin', orderId: string): Cypress.Chainable<string> =>
    cy
        .apiAs<OrderStatus>(persona, 'GET', `/orders/${orderId}`)
        .then((order) => String(order?.status));

/** The slice of a payment the refund row reads. */
interface PaymentAmounts {
    amount: number;
    amountRefunded: number;
}

/**
 * Whether the order's payment has been refunded whole, as the operator reads it.
 *
 * @param orderId - the order
 */
const refundState = (orderId: string): Cypress.Chainable<string> =>
    cy
        .apiAs<PaymentAmounts>('admin', 'GET', `/payments/order/${orderId}`)
        .then<string>((payment) =>
            payment?.amountRefunded === payment?.amount ? 'refunded' : 'open'
        );

const ROWS: readonly PressRow[] = [
    {
        name: 'the customer’s cancel, asked and confirmed twice, cancels once',
        persona: 'user',
        subject: 'order.paid',
        page: (orderId) => `/en/orders/${orderId}`,
        trigger: '[data-test=order-cancel]',
        operation: '**/orders/*/cancel',
        confirms: true,
        effect: (orderId) => statusOf('user', orderId),
        done: 'cancelled'
    },
    {
        name: 'the operator’s cancel and refund cancels once',
        persona: 'admin',
        subject: 'order.paidExpress',
        page: (orderId) => `/en/orders/${orderId}/edit`,
        trigger: '[data-test=button-cancel-and-refund]',
        operation: '**/orders/*/cancel',
        confirms: false,
        effect: (orderId) => statusOf('admin', orderId),
        done: 'cancelled'
    },
    {
        name: 'the operator’s refund refunds once',
        persona: 'admin',
        subject: 'order.paid',
        page: (orderId) => `/en/orders/${orderId}/edit`,
        trigger: '[data-test=button-refund-only]',
        operation: '**/payments/order/*/refund',
        confirms: false,
        effect: refundState,
        done: 'refunded'
    },
    {
        name: 'the customer’s withdrawal, asked and confirmed twice, withdraws once',
        persona: 'user',
        subject: 'order.paid',
        page: (orderId) => `/en/orders/${orderId}`,
        trigger: '[data-test=withdraw-button]',
        operation: '**/returns',
        confirms: true,
        effect: (orderId) => statusOf('user', orderId),
        done: 'cancelled'
    }
];

/** Pressed requests that carried an `Idempotency-Key`, keyed by the request body they carried. */
interface Seen {
    keys: (string | undefined)[];
}

describe('FR19 · A double press on a money button', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    for (const row of ROWS)
        it(row.name, () => {
            cy.subjectId(row.subject).then((orderId) => {
                cy.loginAs(row.persona);
                cy.visit(row.page(orderId));

                const seen: Seen = { keys: [] };
                cy.intercept('POST', row.operation, (request) => {
                    seen.keys.push(request.headers['idempotency-key'] as string | undefined);
                    request.continue();
                });

                cy.step('the control is pressed twice, fast');
                cy.get(row.trigger).should('not.be.disabled').dblclick();

                if (row.confirms) {
                    cy.step('the confirmation is one dialog, and is answered twice, fast');
                    cy.get('[data-test=app-dialog]').should('have.length', 1);
                    cy.get('[data-test=app-dialog-confirm]').dblclick();
                    cy.step('no second confirmation follows the answer');
                    // A queued second confirm would surface within a second of the first closing.
                    // eslint-disable-next-line cypress/no-unnecessary-waiting -- proving an absence takes a bounded wait: nothing signals "no second dialog is coming"
                    cy.wait(1000);
                    cy.get('[data-test=app-dialog]').should('not.exist');
                }

                cy.step('the server shows one effect and the page no error');
                cy.get('[data-test=order-edit-actions-error], [data-test=withdraw-error]').should(
                    'not.exist'
                );
                row.effect(orderId).should('equal', row.done);
                cy.then(() => {
                    expect(seen.keys.length, 'requests sent').to.be.within(1, 2);
                    if (seen.keys.length === 2)
                        expect(seen.keys[0], 'one key for both').to.equal(seen.keys[1]);
                });
            });
        });
});
