// requires-module: products
/**
 * @module
 * VI4 · A guest says no to analytics. A first-time visitor is asked once. Declining is remembered
 * across a reload, the banner does not come back, no Umami tag is loaded and the requests the
 * browsing makes carry no consent header, so the backend's own events for them are dropped. Later,
 * in a fresh session, the same visitor accepts: the tag loads, the requests carry the header, and
 * the backend's events for them are recorded.
 *
 * The consent build only: with no Umami configured the banner never shows and the story skips,
 * like `consent.cy.ts`. The rows themselves are read from Umami on the live profile; on demo the
 * header and the tag are the evidence.
 *
 * The rows are counted against the requests the page really sent, not against a number written
 * here: one search with the header is one `products_searched` row. Asserting the whole story's
 * total after the accepted half also proves the declined half wrote none, without waiting for a
 * row that is never going to come.
 *
 * Only a search with a text of its own is counted. The backend serves a repeated catalogue read
 * from its cache without running the code that emits the event, so a plain list, or a product the
 * page has read before, may or may not leave a row; a search for a text nobody has searched for is
 * always a first read.
 */
import { eventCounts, waitForEvent, withUmami } from '../../../support/e2e/umami';

/** The tag Umami's loader injects, matched by the attribute only it sets. */
const TRACKER = 'script[data-website-id]';

/** The two halves of the story, so a request is told apart by when it was made. */
type Phase = 'declined' | 'accepted';

/** One catalogue request the page made: when, what for, and the consent header it carried. */
interface Seen {
    phase: Phase;
    /** `search` carries a text of the story's own; `list` and `view` are reads the cache may answer. */
    kind: 'search' | 'list' | 'view';
    consent: string | string[] | undefined;
}

/** The header the page sends on an anonymous request once its guest has said yes. */
const CONSENT_HEADER = 'x-analytics-consent';

/** The marker every search text of this run carries, so no earlier run's cache can answer it. */
const RUN = String(Date.now());

/**
 * Browses the way a guest does: the catalogue list, a search for a text of this half's own, then
 * one product's page. Needs the story's `@search` intercept in place.
 *
 * @param phase - which half of the story this is, and the word the search is made of
 * @param product - the `product.*` guarantee to open; a different one each half
 * @param seen - what the page has asked so far, to wait for the search to have gone out
 */
const browse = (phase: Phase, product: string, seen: Seen[]): void => {
    cy.visit('/en/products');
    cy.wait('@search');
    cy.get('[data-test=filter-text] input').type(`vi4-${phase}-${RUN}{enter}`);
    cy.wrap(seen).should((requests) => {
        expect(
            requests.filter((request) => request.phase === phase && request.kind === 'search'),
            'the search for this half’s own text'
        ).to.have.length.greaterThan(0);
    });
    cy.subjectId(product).then((id) => {
        cy.visit(`/en/products/${id}`);
    });
    cy.wait('@view');
};

/**
 * How many searches of this half's own text the page made.
 *
 * @param seen - every catalogue request so far
 * @param phase - which half
 */
const searchesOf = (seen: Seen[], phase: Phase): number =>
    seen.filter((request) => request.phase === phase && request.kind === 'search').length;

describe('VI4 · A guest says no to analytics', () => {
    beforeEach(function () {
        cy.visit('/en');
        cy.restore();
        // The global hook answered "denied" for every spec; this one starts as a first-time visitor.
        cy.clearCookies();
        cy.clearAllLocalStorage();
        cy.visit('/en');
        cy.get('#home-page').should('exist');
        cy.get('body').then(($body) => {
            if ($body.find('[data-test=analytics-consent-banner]').length === 0) this.skip();
        });
    });

    it('stays quiet after a no, across a reload; a later yes turns it on', () => {
        const since = Date.now() - 60 * 1000;
        const seen: Seen[] = [];
        let phase: Phase = 'declined';
        let before: Record<string, number> = {};

        cy.intercept('POST', '**/products/search', (request) => {
            const text = (request.body as { text?: string }).text ?? '';
            seen.push({
                phase,
                kind: text.includes(RUN) ? 'search' : 'list',
                consent: request.headers[CONSENT_HEADER]
            });
        }).as('search');
        // `resourceType: 'xhr'`: the page's own address ends the same way, and a document request is not the API's.
        cy.intercept(
            { method: 'GET', url: /\/products\/[\da-f]{24}$/, resourceType: 'xhr' },
            (request) => {
                seen.push({ phase, kind: 'view', consent: request.headers[CONSENT_HEADER] });
            }
        ).as('view');
        withUmami((session) => {
            eventCounts(session, since).then((counts) => {
                before = counts;
            });
        });

        cy.step('the first visit asks, and loads nothing before an answer');
        cy.get('[data-test=analytics-consent-banner]').should('be.visible');
        cy.get(TRACKER).should('not.exist');

        cy.step('declining is remembered across a reload: no banner, no tag');
        cy.get('[data-test=analytics-consent-decline]').click();
        cy.reload();
        cy.get('[data-test=analytics-consent-banner]').should('not.exist');
        cy.get(TRACKER).should('not.exist');

        cy.step('browsing as a decliner sends no consent header');
        browse('declined', 'product.inStock', seen);
        cy.get('[data-test=analytics-consent-banner]').should('not.exist');
        cy.get(TRACKER).should('not.exist');
        cy.then(() => {
            const declined = seen.filter((request) => request.phase === 'declined');
            expect(declined.length, 'the browse really asked the catalogue').to.be.greaterThan(2);
            expect(
                declined.filter((request) => request.consent !== undefined),
                'requests that carried the consent header'
            ).to.have.length(0);
        });

        cy.step('in a fresh session the same visitor is asked again, and says yes');
        cy.then(() => {
            phase = 'accepted';
        });
        cy.clearCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();
        cy.visit('/en');
        cy.get('[data-test=analytics-consent-banner]').should('be.visible');
        cy.get('[data-test=analytics-consent-accept]').click();
        cy.get('[data-test=analytics-consent-banner]').should('not.exist');

        cy.step('browsing as a consenter loads the tag and sends the header');
        browse('accepted', 'product.rich', seen);
        cy.get(TRACKER).should('exist');
        cy.then(() => {
            const accepted = seen.filter((request) => request.phase === 'accepted');
            expect(accepted.length, 'the browse really asked the catalogue').to.be.greaterThan(2);
            expect(
                accepted.filter((request) => request.consent !== 'true'),
                'requests that went without the consent header'
            ).to.have.length(0);
        });

        cy.step('the backend recorded one row per accepted search, and none for the declined one');
        withUmami((session) => {
            waitForEvent(
                session,
                since,
                'products_searched',
                (before.products_searched ?? 0) + searchesOf(seen, 'accepted')
            ).then(() => {
                eventCounts(session, since).then((after) => {
                    expect(
                        (after.products_searched ?? 0) - (before.products_searched ?? 0),
                        'searches recorded: the accepted ones only'
                    ).to.equal(searchesOf(seen, 'accepted'));
                });
            });
        });
    });
});
