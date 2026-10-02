/**
 * @module
 * One add-to-cart writes ONE row into Umami — the claim neither repo's own suite can make.
 *
 * ── WHY THIS CANNOT BE A UNIT TEST ───────────────────────────────────────────────────────────
 * Both repos write into one Umami website, and the bug this guards against was invisible from
 * inside either one: the frontend fired `cart_item_added` from its cart store, the backend fired
 * it from `POST /cart`, both suites asserted their own emission and both passed. The two
 * rows were indistinguishable — same name, same properties, same website id, and the same visitor
 * hash, because the backend forwards the caller's `User-Agent` and address for attribution. Every
 * count built on those names read twice reality, and nothing anywhere errored.
 *
 * What proves it fixed is not "did this side emit" but "how many rows exist", and only a live run
 * with both trackers pointed at a real Umami can ask that.
 *
 * ── THE CONTROL MATTERS AS MUCH AS THE ASSERTION ─────────────────────────────────────────────
 * A delta of one is the right answer, and it is also what a completely broken backend tracker
 * would produce if the frontend were still emitting — and what a broken FRONTEND tracker produces
 * when the backend is correct. So the spec first proves the browser tracker reaches this Umami, by
 * watching the PAGEVIEW count move. Pageviews are the only thing this app writes into Umami — it
 * emits no custom events at all — which is what makes them the honest liveness signal here: with
 * the browser half demonstrably live and `cart_item_added` still arriving exactly once, the row
 * can only be the backend's.
 *
 * ── WHY IT SKIPS UNDER THE DEMO PROFILE ──────────────────────────────────────────────────────
 * `npm run test:e2e` runs a real backend, but the demo profile wires no Umami — so the event is
 * emitted into nothing and there is no row to count.
 * `cy.skipUnlessLive()` is the repo's existing answer for that, and using it rather than a local
 * check is what keeps the reason in one place: this spec is live-only for the same reason
 * `cy.restore()` is, and it should stop running for the same reason too.
 */

import {
    eventCounts,
    pageviewCount,
    umamiSession,
    waitForEvent,
    waitForPageviews
} from '../../../../../tests/support/e2e/umami';

describe('Analytics, end to end', () => {
    // The demo profile has no Umami behind it, so there is nothing to count.
    beforeEach(() => cy.skipUnlessLive());

    it('records one add-to-cart once, not twice', () => {
        const since = Date.now() - 60 * 1000;

        cy.restore();
        // Umami's tag loads only after consent, so the pageview control below needs a yes.
        cy.setCookie('analyticsConsent', 'granted');

        umamiSession().then((session) => {
            eventCounts(session, since).then((before) => {
                const addedBefore = before.cart_item_added ?? 0;

                pageviewCount(session, since).then((viewsBefore) => {
                    // Through the UI, not the API: the point is ONE user action, and it is the
                    // click that sets both trackers off at once. Any in-stock product walks the
                    // same path a person does, so the subject is asked for by role.
                    cy.loginAs('user');
                    cy.subjectId('product.inStock').then((id) => {
                        cy.visit(`/en/products/${id}`);
                    });

                    cy.get('[data-test=add-to-cart]').should('be.enabled').click();
                    cy.contains('Product added to cart').should('exist');

                    // The control: the browser tracker reached this Umami on this visit. Without
                    // it a silent frontend and a correct backend look identical to a broken
                    // backend and a still-emitting frontend — both report one row.
                    waitForPageviews(session, since, viewsBefore + 1).then((views) =>
                        expect(
                            views,
                            'the browser tracker reached Umami — otherwise this spec proves nothing'
                        ).to.be.greaterThan(viewsBefore)
                    );

                    waitForEvent(session, since, 'cart_item_added', addedBefore + 1).should(
                        (counts) => {
                            const delta = (counts.cart_item_added ?? 0) - addedBefore;
                            expect(
                                delta,
                                'one add-to-cart writes one row: 2 is both repos emitting the same name, ' +
                                    '0 is the backend tracker not reporting at all'
                            ).to.equal(1);
                        }
                    );
                });
            });
        });
    });

    it('writes no server-owned event for a visit that changes nothing', () => {
        // The other half of the split. Loading a page writes its pageview and must emit none of
        // the backend's event names — a reload is not a checkout. Measured as a DELTA rather than
        // as a count over a window, because whatever the rest of the suite did a minute ago is not
        // this test's business, and asserting on it would make this spec fail for other people's
        // reasons.
        const since = Date.now() - 60 * 1000;

        // Umami's tag loads only after consent, so the visit below is only recorded with a yes.
        cy.setCookie('analyticsConsent', 'granted');

        umamiSession().then((session) => {
            eventCounts(session, since).then((before) => {
                pageviewCount(session, since).then((viewsBefore) => {
                    cy.visit('/en');

                    waitForPageviews(session, since, viewsBefore + 1).then((views) =>
                        expect(
                            views,
                            'the visit was recorded, so the tracker was awake for this check'
                        ).to.be.greaterThan(viewsBefore)
                    );

                    eventCounts(session, since).then((counts) => {
                        for (const owned of [
                            'checkout_completed',
                            'order_created',
                            'payment_succeeded'
                        ])
                            expect(
                                (counts[owned] ?? 0) - (before[owned] ?? 0),
                                `${owned} is the backend's, and a page load makes no such request`
                            ).to.equal(0);
                    });
                });
            });
        });
    });
});
