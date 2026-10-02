// requires-module: none
/**
 * @module
 * The journey harness itself: `cy.travel`, the persona and staff accounts, a second device, a signed
 * payment webhook, the webhook sink, the job lever, and the browser helpers. A journey spec leans
 * on them, so they are proven once here rather than by whichever journey lands first. `cy.step`'s
 * failure prefix is a pure function, tested in `tests/unit/scripts/e2e/step-prefix.spec.ts`.
 *
 * The clock, the sink and the job lever are demo-only (the backend's `/__test/*` and a listener
 * this process hosts), so those cases open with `cy.skipUnlessDemo()`; the rest run on both profiles.
 */
import { seedAccount } from '../../support/e2e/scenario';
import {
    loginDevice,
    postPaymentWebhook,
    refreshDevice,
    requestAsDevice,
    webhookSink
} from '../../support/e2e/harness';

/** The one slice of `GET /products/categories` the cache spec reads. */
interface FacetsBody {
    data: { categories: { name: string }[] };
}

/** One hour, in milliseconds. */
const HOUR_MS = 3_600_000;

/** Real time that passes between two reads of the clock. */
const DRIFT_MS = 5000;

/**
 * The demo clock's offset from real time, in milliseconds.
 *
 * @returns a chain yielding the backend's `offsetMs`
 */
const clockOffset = (): Cypress.Chainable<number> =>
    cy
        .env(['apiUrl'])
        .then(({ apiUrl }) => cy.request(`${String(apiUrl)}/__test/clock`))
        .then((response) => (response.body as { offsetMs: number }).offsetMs);

describe('The journey harness', () => {
    beforeEach(() => {
        cy.visit('/en');
        cy.restore();
    });

    describe('cy.travel', () => {
        it('moves the backend clock forward, and a restore puts it back', () => {
            cy.skipUnlessDemo();

            clockOffset().should('be.lessThan', DRIFT_MS);

            cy.step('jumps an hour ahead');
            cy.travel(HOUR_MS);
            clockOffset().should('be.gte', HOUR_MS - DRIFT_MS);

            cy.step('restores');
            cy.restore();
            clockOffset().should('be.lessThan', DRIFT_MS);
        });
    });

    describe('the persona accounts', () => {
        it('are all described by the backend, the two-factor one with its backup codes', () => {
            for (const role of ['unverified', 'twoFactor', 'pendingEmail', 'banned'] as const)
                expect(seedAccount(role).email, role).to.contain('@');

            expect(seedAccount('twoFactor').backupCodes, 'backup codes').to.have.length(5);
        });

        it('are also asked for as a command, which reads the login when it runs', () => {
            cy.accountOf('twoFactor').should((account) => {
                expect(account.email).to.equal(seedAccount('twoFactor').email);
                expect(account.backupCodes).to.have.length(5);
            });
        });

        it('can sign in as the unverified and the pending-email accounts', () => {
            cy.loginAs('unverified');
            cy.get('[data-test=user-menu]').should('exist');
            cy.logout();

            cy.loginAs('pendingEmail');
            cy.get('[data-test=user-menu]').should('exist');
        });

        it('stops the two-factor account at the challenge', () => {
            cy.visit('/en/login');
            cy.get('[type=email]').type(seedAccount('twoFactor').email);
            cy.get('[type=password]').type(seedAccount('twoFactor').password);
            cy.get('form').submit();

            cy.get('#two-factor-challenge-page').should('exist');
        });

        it('refuses the banned account a session', () => {
            cy.visit('/en/login');
            cy.get('[type=email]').type(seedAccount('banned').email);
            cy.get('[type=password]').type(seedAccount('banned').password);
            cy.get('form').submit();

            cy.url().should('include', '/login');
            cy.get('[data-test=user-menu]').should('not.exist');
        });
    });

    describe('the staff accounts', () => {
        it('are all described by the backend', () => {
            for (const role of ['manager', 'warehouse', 'support', 'operator'] as const)
                expect(seedAccount(role).email, role).to.equal(`${role}@example.com`);
        });

        it('each sign in through the real form', () => {
            for (const role of ['manager', 'warehouse', 'support', 'operator'] as const) {
                cy.loginAs(role);
                cy.get('[data-test=user-menu]').should('exist');
                cy.logout();
            }
        });
    });

    describe('a second device', () => {
        it('holds its own session: refreshes, acts, and is refused once signed out everywhere', () => {
            loginDevice('user').then((device) => {
                cy.step('acts with its own bearer token');
                requestAsDevice(device, 'GET', '/account/sessions')
                    .its('status')
                    .should('equal', 200);

                cy.step('refreshes with its own cookie');
                refreshDevice(device).then((refreshed) => {
                    expect(refreshed.status).to.equal(200);

                    cy.step('signs out everywhere, and its next refresh is refused');
                    requestAsDevice(refreshed.device, 'POST', '/account/logout-all')
                        .its('status')
                        .should('equal', 200);
                    refreshDevice(refreshed.device).its('status').should('equal', 401);
                });
            });
        });
    });

    describe('a payment-provider webhook', () => {
        it('is accepted when signed, and refused when the signature is stale', () => {
            postPaymentWebhook({ id: 'evt-harness-ignored' }).should('equal', 200);

            const anHourAgo = Math.floor(Date.now() / 1000) - HOUR_MS / 1000;
            postPaymentWebhook({ id: 'evt-harness-stale' }, anHourAgo).should('equal', 400);
        });
    });

    describe('the webhook sink', () => {
        it('receives a replayed delivery, signed with the seeded subscription secret', () => {
            cy.skipUnlessDemo();

            webhookSink.clear();

            cy.step('picks a delivery the shop build left behind');
            cy.apiAs<{ items: { id: string }[] }>('admin', 'GET', '/webhooks/deliveries').then(
                (deliveries) => {
                    expect(deliveries?.items, 'seeded deliveries').to.have.length.greaterThan(0);

                    cy.step('replays it');
                    cy.apiAs(
                        'admin',
                        'POST',
                        `/webhooks/deliveries/${deliveries!.items[0].id}/replay`
                    );
                }
            );

            cy.step('reads what arrived');
            webhookSink.requests().then((requests) => {
                expect(requests, 'requests at the sink').to.have.length(1);
                expect(requests[0].signatureValid, 'signature verifies').to.equal(true);
                expect(JSON.parse(requests[0].body), 'a real event').to.have.property('type');
            });
        });
    });

    describe('the job lever', () => {
        it('runs reap-orders on demand, and refuses a job it does not carry', () => {
            cy.skipUnlessDemo();

            cy.env(['apiUrl']).then(({ apiUrl }) => {
                cy.request('POST', `${String(apiUrl)}/__test/jobs/reap-orders`)
                    .its('body')
                    .should('deep.equal', { job: 'reap-orders', result: 0 });
                cy.request({
                    method: 'POST',
                    url: `${String(apiUrl)}/__test/jobs/not-a-job`,
                    failOnStatusCode: false
                })
                    .its('status')
                    .should('equal', 404);
            });
        });
    });

    describe('the browser helpers', () => {
        it('reads back the clipboard after a grant', () => {
            cy.visit('/en');
            cy.grantClipboard();

            cy.window().then((win) =>
                win.navigator.clipboard
                    .writeText('copied by the harness')
                    .then(() => win.navigator.clipboard.readText())
                    .then((text) => expect(text).to.equal('copied by the harness'))
            );
        });

        it('stubs window.open so an opening can be asserted instead of followed', () => {
            cy.visit('/en');
            cy.stubWindowOpen();

            cy.window().then((win) => win.open('/en/about', '_blank'));

            cy.get('@windowOpen').should('be.calledOnceWith', '/en/about', '_blank');
        });
    });

    describe('cy.restore and the browser cache', () => {
        it('empties the HTTP cache, so a cached facets read is not replayed against new data', () => {
            // Only a real response cache answers `Cache-Control: max-age`; the demo's is off.
            cy.skipUnlessLive();

            const category = `harnesscat${String(Date.now())}`;

            cy.env(['apiUrl']).then(({ apiUrl }) => {
                /** Reads the facets through the page's own fetch, so the browser cache is in play. */
                const facetNames = () =>
                    cy.window().then((win) =>
                        win
                            .fetch(`${String(apiUrl)}/products/categories`)
                            .then((response) => response.json() as Promise<FacetsBody>)
                            .then((body) => body.data.categories.map(({ name }) => name))
                    );

                cy.step('a product in a new category lands, and a browser read caches the chips');
                cy.apiAs('admin', 'POST', '/products', {
                    price: 1,
                    categories: [category],
                    translations: { en: { title: category } }
                });
                facetNames().should('include', category);

                cy.step(
                    'a restore removes the product, and the next read must not replay the chips'
                );
                cy.restore();
                facetNames().should('not.include', category);
            });
        });
    });
});
