// requires-module: account, cart, orders, products, webhooks
/**
 * @module
 * IN8 · An endpoint that never answers. A manager subscribes an address that is down. Each
 * delivery climbs the retry ladder (5 s, 5 min, 30 min, 2 h, 10 h) and ends `exhausted`; the
 * subscription stays on while the failures are young, and switches itself off only once five
 * chains in a row have failed AND the first of them is three days old. The manager hears of it in
 * the inbox (a work notice, no mail), the audit trail says so, the next order writes no row for
 * it. Pointing it at a working address and switching it on clears the count, and a replayed row
 * then arrives.
 *
 * Demo only: it moves the demo backend's clock for days (`cy.travel`) and pulls the retry sweep
 * with the job lever (`cy.runJob`). The dead address is a path on the receiver's own origin that
 * names `dead`, which the sink answers with a 503.
 */
import { forgetWebhooks } from '../../../support/e2e/harness';
import {
    deliveriesOf,
    deliveryNow,
    placeOrderAsCustomer,
    receivedAtLeast,
    seededSubscription,
    setEnabledOnTheDetailPage,
    sinkEndpoint
} from '../../../support/e2e/integrator';
import { eventually } from '../../../support/e2e/steps';

/** The retry ladder's waits, in the order the attempts fail (`webhooks/domain/backoff.ts`). */
const LADDER_MS = [5000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 10 * 3_600_000];

/** The failure streak must be this old before the auto-disable counts (`WEBHOOK_MIN_FAILING_MS`). */
const THREE_DAYS_MS = 3 * 24 * 3_600_000;

/** What the specs read of a subscription. */
interface SubscriptionState {
    id: string;
    url: string;
    enabled: boolean;
    consecutiveFailures: number;
    disabledAt?: string;
}

/**
 * The subscription as the admin API lists it now (there is no read by id: the list carries the
 * failure count and the switch-off time).
 *
 * @param subscriptionId - which subscription
 * @returns a chain yielding its state
 */
const stateOf = (subscriptionId: string): Cypress.Chainable<SubscriptionState> =>
    cy
        .apiAs<{ items: SubscriptionState[] }>(
            'admin',
            'GET',
            '/webhooks/subscriptions?pageSize=100'
        )
        .then((page) => {
            const found = page?.items.find((candidate) => candidate.id === subscriptionId);
            if (!found) throw new Error(`stateOf: no subscription ${subscriptionId} in the list`);
            return found;
        });

/**
 * Puts one order in the shop and cancels it, so the subscription is told twice (created, then
 * cancelled), and waits until both rows are in the log.
 *
 * @param subscriptionId - the subscription that must hold two more rows
 * @returns a chain yielding the two new rows' ids
 */
const placeAndCancelOneOrder = (subscriptionId: string): Cypress.Chainable<string[]> =>
    deliveriesOf(subscriptionId).then((before) => {
        const known = new Set(before.map((row) => row.id));
        placeOrderAsCustomer().then((orderId) => {
            cy.apiAs('admin', 'POST', `/orders/${orderId}/cancel`);
        });
        return eventually(
            () => deliveriesOf(subscriptionId),
            (rows) => rows.filter((row) => !known.has(row.id)).length >= 2
        ).then((rows) => rows.filter((row) => !known.has(row.id)).map((row) => row.id));
    });

/**
 * Walks every row of the subscription down the whole ladder: the sweep sends the attempt, the
 * clock passes the wait, the sweep sends the next, until the sixth attempt fails and the row is
 * exhausted. Rows made together climb together.
 */
const walkTheLadder = (): void => {
    cy.runJob('sweep-webhook-retries');
    for (const wait of LADDER_MS) {
        cy.travel(wait + 1000);
        cy.runJob('sweep-webhook-retries');
    }
};

/**
 * Asserts the given rows ended on the last rung.
 *
 * @param subscriptionId - whose log
 * @param rowIds - the rows to check
 */
const expectExhausted = (subscriptionId: string, rowIds: string[]): void => {
    deliveriesOf(subscriptionId).then((rows) => {
        for (const id of rowIds) {
            const row = rows.find((candidate) => candidate.id === id);
            expect(row?.status, `row ${id}`).to.equal('exhausted');
            expect(row?.attempt, `row ${id} attempts`).to.equal(LADDER_MS.length + 1);
        }
    });
};

describe('IN8 · An endpoint that never answers', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
        cy.visit('/en');
    });

    it('is retried down the ladder, switched off after five failed chains over three days, and comes back when the address is fixed', () => {
        cy.skipUnlessDemo();

        cy.step(
            'the receiver is up, so a dead path answers 503 rather than refusing the connection'
        );
        forgetWebhooks();

        cy.step('the manager subscribes an address that is down, to created and cancelled');
        let subscriptionId = '';
        let deadUrl = '';
        sinkEndpoint('/in8-dead').then((url) => {
            deadUrl = url;
            cy.apiAs<SubscriptionState>('manager', 'POST', '/webhooks/subscriptions', {
                url,
                eventTypes: ['order.created', 'order.cancelled']
            }).then((created) => {
                if (!created) throw new Error('the subscription was not created');
                subscriptionId = created.id;
            });
        });

        cy.step('the first order: both deliveries climb all six attempts and end exhausted');
        let firstRows: string[] = [];
        cy.then(() =>
            placeAndCancelOneOrder(subscriptionId).then((ids) => {
                firstRows = ids;
            })
        );
        cy.then(() => walkTheLadder());
        cy.then(() => expectExhausted(subscriptionId, firstRows));

        cy.step('a few failed chains are not enough: the streak is young, the subscription is on');
        cy.then(() =>
            stateOf(subscriptionId).then((state) => {
                // The seed leaves an unpaid order open, and the first order frees it: its
                // cancellation is a third row, so the streak is two or three, below the five.
                expect(state.consecutiveFailures).to.be.at.least(2).and.below(5);
                expect(state.enabled).to.equal(true);
                expect(state.disabledAt).to.equal(undefined);
            })
        );

        cy.step('three days later a second order brings the streak to five, and it switches off');
        cy.travel(THREE_DAYS_MS);
        cy.then(() => placeAndCancelOneOrder(subscriptionId));
        cy.then(() => walkTheLadder());
        cy.then(() =>
            stateOf(subscriptionId).then((state) => {
                expect(state.enabled).to.equal(false);
                expect(state.disabledAt, 'when it switched itself off').to.be.a('string');
                expect(state.consecutiveFailures).to.be.at.least(5);
            })
        );

        cy.step('the manager sees it switched off, and the staff notice names the subscription');
        eventually(
            () =>
                cy.apiAs<{
                    items: { code: string; params?: { subscriptionId?: string } }[];
                }>('manager', 'GET', '/notifications'),
            (inbox) =>
                inbox?.items.some(
                    ({ code, params }) =>
                        code === 'notifications.staff.webhook-disabled' &&
                        params?.subscriptionId === subscriptionId
                ) ?? false
        ).then((inbox) => {
            expect(
                inbox?.items.some(({ params }) => params?.subscriptionId === subscriptionId),
                'the staff notice for the switch-off'
            ).to.equal(true);
        });
        cy.loginAs('manager');
        cy.then(() => cy.visit(`/en/webhooks/subscriptions/${subscriptionId}`));
        cy.contains('Auto-disabled').should('exist');
        cy.contains('Auto-disabled at').should('exist');

        cy.step('the audit trail names the switch-off as the system’s doing');
        cy.then(() =>
            cy
                .apiAs<{ items: { action: string }[] }>(
                    'admin',
                    'GET',
                    `/audit?action=system.webhook_subscription.auto_disabled&target=${subscriptionId}`
                )
                .then((page) => {
                    expect(page?.items.length, 'auto-disable audit rows').to.be.at.least(1);
                })
        );

        cy.step('the next order writes no row for a switched-off subscription');
        cy.then(() =>
            deliveriesOf(subscriptionId).then((rows) => {
                const before = rows.length;
                seededSubscription().then((seeded) =>
                    deliveriesOf(seeded.id).then((seededBefore) => {
                        const seededKnown = new Set(seededBefore.map((row) => row.id));
                        placeOrderAsCustomer();
                        // The healthy subscription was told, so the event did travel.
                        eventually(
                            () => deliveriesOf(seeded.id),
                            (seededRows) => seededRows.some((row) => !seededKnown.has(row.id))
                        );
                        deliveriesOf(subscriptionId).then((after) => {
                            expect(after.length, 'rows for the switched-off subscription').to.equal(
                                before
                            );
                        });
                    })
                );
            })
        );

        cy.step('the manager points it at a working address and enables it: the count clears');
        let aliveUrl = '';
        sinkEndpoint('/in8-alive').then((url) => {
            aliveUrl = url;
        });
        cy.then(() => {
            cy.visit(`/en/webhooks/subscriptions/${subscriptionId}/edit`);
            cy.get('[data-test=webhook-url] input').should('have.value', deadUrl);
            cy.get('[data-test=webhook-url] input').clear();
            cy.get('[data-test=webhook-url] input').type(aliveUrl);
            cy.get('form').submit();
            cy.contains('Subscription updated').should('exist');
            // Turning it back on is its own action, on the detail page.
            setEnabledOnTheDetailPage(subscriptionId, aliveUrl, true);
        });
        cy.then(() =>
            stateOf(subscriptionId).then((state) => {
                expect(state.enabled).to.equal(true);
                expect(state.consecutiveFailures).to.equal(0);
                expect(state.disabledAt).to.equal(undefined);
            })
        );

        cy.step('a replayed row now arrives at the working address');
        cy.then(() => {
            const [exhaustedId] = firstRows;
            if (!exhaustedId) throw new Error('no exhausted row to replay');
            cy.apiAs('admin', 'POST', `/webhooks/deliveries/${exhaustedId}/replay`);
            deliveryNow(subscriptionId, exhaustedId).its('status').should('equal', 'succeeded');
            receivedAtLeast(aliveUrl, 1);
        });
    });
});
