// requires-module: account, orders, returns
/**
 * @module
 * CU23 · The days run out. The right of withdrawal has an end, and the end is a whole calendar day:
 * on the last day the button is still offered, even at one in the morning; only after that day is it
 * gone, and the API agrees with `RETURN_WINDOW_CLOSED`. Nothing here names the length of the period:
 * the deadline is read off the order (`actions.withdrawUntil`), so a deployment that offers longer
 * than the law's fourteen days changes nothing in the story.
 *
 * Two parts. An order delivered long ago is shut on any profile. The walk up to the deadline moves the
 * demo backend's clock, so it runs on the demo profile only.
 */
import type { Device, DeviceResponse } from '../../../../scripts/e2e/device-session';

/** One hour, in milliseconds. */
const HOUR_MS = 60 * 60 * 1000;

/** The slice of an order this story reads: the deadline the server decided. */
interface OrderLike {
    actions?: { withdraw?: boolean; withdrawUntil?: string };
}

/** The error envelope a refused call carries. */
interface RefusalBody {
    errors?: { code?: string }[];
}

/**
 * Asks the API to open a withdrawal on an order, as a fresh device of the customer, and asserts it
 * is refused because the window has closed.
 *
 * @param orderId - the order to withdraw from
 */
const apiRefusesWithdrawal = (orderId: string): void => {
    // The harness's tasks are called directly, not through `support/e2e/harness`: importing that
    // module would import `scenario.ts` too, and this spec would then keep its own copy of the
    // backend's description, stale after every live reset.
    cy.env(['apiUrl']).then(({ apiUrl }) => {
        cy.accountOf('user').then(({ email, password }) => {
            cy.task<Device>('deviceLogin', { apiUrl: String(apiUrl), email, password }).then(
                (device) => {
                    cy.task<DeviceResponse>('deviceRequest', {
                        device,
                        method: 'POST',
                        path: '/returns',
                        body: { orderId, reason: 'withdrawal' }
                    }).should((answer) => {
                        expect(answer.status).to.be.within(400, 499);
                        const codes = ((answer.body as RefusalBody).errors ?? []).map(
                            ({ code }) => code
                        );
                        expect(codes).to.include('RETURN_WINDOW_CLOSED');
                    });
                }
            );
        });
    });
};

/**
 * Moves the demo clock so that it reads `target`.
 *
 * @param target - the instant to reach; must be ahead of the clock
 */
const travelTo = (target: number): void => {
    cy.env(['apiUrl']).then(({ apiUrl }) => {
        cy.request(`${String(apiUrl)}/__test/clock`).then((response) => {
            const now = Date.parse((response.body as { now: string }).now);
            expect(target, 'the clock only moves forward').to.be.greaterThan(now);
            cy.travel(target - now);
        });
    });
};

describe('CU23 · The days run out', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('an order delivered long ago offers no withdrawal, and the API refuses one', () => {
        cy.subjectId('order.deliveredLongAgo').then((orderId) => {
            cy.step('the customer opens an order whose days ran out long ago');
            cy.clearAllCookies();
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('#order-target').should('exist');
            cy.get('[data-test=payment-status]').should('exist');
            cy.get('[data-test=withdraw-button]').should('not.exist');
            cy.get('[data-test=withdrawal-until]').should('not.exist');

            cy.step('the API refuses the withdrawal in words a client can act on');
            apiRefusesWithdrawal(orderId);
        });
    });

    it('the button is offered through the last day, and gone after it', () => {
        cy.skipUnlessDemo();
        cy.subjectId('order.deliveredRecent').then((orderId) => {
            cy.step('the customer reads the deadline the server decided');
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=withdraw-button]').should('exist');
            cy.get('[data-test=withdrawal-until]').should('exist');
            const deadline = { at: 0 };
            cy.apiAs<OrderLike>('user', 'GET', `/orders/${orderId}`).then((order) => {
                deadline.at = Date.parse(String(order?.actions?.withdrawUntil));
                expect(deadline.at, 'a deadline in the future').to.be.greaterThan(Date.now());
            });

            cy.step('an hour into the last day the button is still there');
            // The deadline is the end of the last day; 23 hours before it is one in the morning of it.
            cy.then(() => {
                travelTo(deadline.at - 23 * HOUR_MS);
            });
            // Days have passed for the session too: start from a signed-out browser.
            cy.clearAllCookies();
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('[data-test=withdraw-button]').should('exist');
            cy.get('[data-test=withdrawal-until]').should('exist');

            cy.step('the day after, the button is gone and the API says why');
            cy.then(() => {
                travelTo(deadline.at + 2 * HOUR_MS);
            });
            cy.clearAllCookies();
            cy.loginAs('user');
            cy.visit(`/en/orders/${orderId}`);
            cy.get('#order-target').should('exist');
            cy.get('[data-test=payment-status]').should('exist');
            cy.get('[data-test=withdraw-button]').should('not.exist');
            apiRefusesWithdrawal(orderId);
        });
    });
});
