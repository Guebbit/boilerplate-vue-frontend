/**
 * The touch contract of the shell: what a finger can do that the keyboard spec cannot check.
 *
 * Headless Chromium has no touch screen, so a narrow window alone still lays out for a mouse.
 * `applyViewport` switches CDP touch emulation on for the phone and tablet sizes, which flips
 * `(hover: none)`, `(pointer: coarse)` and `ontouchstart` — and Vuetify's touch-only paths with
 * them. These cases perform real taps and swipes (`cypress-real-events`) and read what a person
 * would see. How it works and why: `docs/tools/touch-testing.md`.
 *
 * Touch describes sit AFTER the desktop one on purpose: in live Chromium, a test that follows a
 * touch test in the same spec loses its mouse (the reset falls back to "no pointer").
 *
 * Runs under the demo profile like every other spec in `ci.yml`.
 */
import { classifyTouchProbes, gatedFindings } from '../../../scripts/e2e/touch-findings';
import { applyViewport } from '../../support/e2e/apply-viewport';
import { collectTouchProbes } from '../../support/e2e/touch';

/** The tooltip showing, by Vuetify's active class: tooltip content is `pointer-events: none`. */
const SHOWN_TOOLTIP = '.v-tooltip.v-overlay--active .v-overlay__content';

/** The first entry of the menu that just opened. */
const FIRST_MENU_ENTRY = '.v-overlay--active [role=menuitem]';

/** Answers a media query in the app's own window. */
const mediaMatches = (query: string) =>
    cy.window({ log: false }).then((win) => win.matchMedia(query).matches);

describe('touch', () => {
    describe('on a desktop', () => {
        it('reports a mouse: hover and a fine pointer', () => {
            cy.visit('/en');
            applyViewport('desktop');

            mediaMatches('(hover: hover)').should('eq', true);
            mediaMatches('(pointer: fine)').should('eq', true);
        });
    });

    describe('on a phone', () => {
        it('reports a finger, and the next test gets its mouse back', () => {
            // Before the visit: `ontouchstart` exists only on a document loaded under emulation.
            applyViewport('phone');
            cy.visit('/en');

            mediaMatches('(hover: none)').should('eq', true);
            mediaMatches('(any-hover: hover)').should('eq', false);
            mediaMatches('(pointer: coarse)').should('eq', true);
            cy.window({ log: false }).should((win) => {
                expect('ontouchstart' in win, 'ontouchstart on window').to.equal(true);
            });
            cy.window({ log: false }).its('navigator.maxTouchPoints').should('eq', 5);
        });

        it('starts without touch: the reset after the previous test worked', () => {
            cy.visit('/en');

            mediaMatches('(pointer: coarse)').should('eq', false);
        });

        it('opens the drawer by a tap, taps every entry, and closes it by a tap on the scrim', () => {
            applyViewport('phone');
            cy.visit('/en');
            cy.get('h1').should('exist');

            cy.get('[aria-controls=app-drawer]').tap();
            cy.get('#app-drawer').should('be.visible');
            // A toast can cover the last entries on a phone: each must be reachable by a finger.
            cy.get('#app-drawer a, #app-drawer button').each(($entry) => {
                cy.wrap($entry).shouldBeTappable();
            });

            // The scrim is covered on the right by the drawer itself: touch its free left edge.
            cy.get('.v-navigation-drawer__scrim').realTouch({ x: 10, y: 300 });
            cy.get('#app-drawer').should('not.be.visible');
        });

        it('opens the drawer by a swipe from the right edge, as the hamburger is not the only way', () => {
            applyViewport('phone');
            cy.visit('/en');
            cy.get('h1').should('exist');

            // The drawer is `location="end"`: Vuetify opens it for a swipe that starts within
            // 25 px of the right edge of the DOCUMENT, which a classic scrollbar makes narrower
            // than the window (a touch on the scrollbar reaches the page as nothing).
            cy.window({ log: false }).then((win) => {
                const edge = win.document.documentElement.clientWidth;
                cy.get('body').realSwipe('toLeft', { x: edge - 10, y: 400, length: 200 });
            });

            cy.get('#app-drawer').should('be.visible');
        });
    });

    describe('menus and tooltips', () => {
        for (const viewport of ['phone', 'tablet'] as const)
            for (const [role, menu] of [
                ['user', 'user-menu'],
                ['admin', 'admin-menu']
            ] as const)
                it(`opens the ${menu} by a tap at ${viewport} with no tooltip over its first entry`, () => {
                    cy.loginAs(role);
                    cy.visit('/en');
                    applyViewport(viewport);
                    cy.get('h1').should('exist');

                    cy.get(`[data-test=${menu}]`).tap();

                    cy.get(FIRST_MENU_ENTRY).first().shouldBeTappable();
                    // Rectangles, not a hit test: tooltip content ignores pointer events.
                    cy.get(FIRST_MENU_ENTRY)
                        .first()
                        .then(($entry) => {
                            const entry = $entry.get(0)?.getBoundingClientRect();
                            cy.document({ log: false }).then((page) => {
                                for (const tooltip of page.querySelectorAll(SHOWN_TOOLTIP)) {
                                    const box = tooltip.getBoundingClientRect();
                                    const overlaps =
                                        entry !== undefined &&
                                        box.left < entry.right &&
                                        box.right > entry.left &&
                                        box.top < entry.bottom &&
                                        box.bottom > entry.top;
                                    expect(
                                        overlaps,
                                        'a tooltip covering the first menu entry'
                                    ).to.equal(false);
                                }
                            });
                        });
                });

        it('goes to the cart by a tap on the pinned entry and leaves no tooltip behind', () => {
            cy.loginAs('user');
            cy.visit('/en');
            applyViewport('phone');
            cy.get('h1').should('exist');

            cy.get('[data-test^=pinned-]').first().tap();

            cy.location('pathname').should('match', /cart/);
            cy.get('h1').should('exist');
            cy.get(SHOWN_TOOLTIP).should('not.exist');
        });

        it('switches the language by a tap at tablet width', () => {
            cy.visit('/en');
            applyViewport('tablet');
            cy.get('h1').should('exist');

            cy.get('[data-test=language-switcher]').tap();
            cy.get('[data-test=language-option-it]').tap();

            cy.get('html').should('have.attr', 'lang', 'it');
        });

        it('opens the notifications panel by a tap at tablet width', () => {
            cy.loginAs('user');
            cy.visit('/en');
            applyViewport('tablet');
            cy.get('h1').should('exist');

            cy.get('[data-test=notifications-bell]').tap();

            cy.get('[data-test=notifications-panel]').should('be.visible');
        });
    });

    describe('the scan', () => {
        it('catches a control only a hover reveals and a title that holds cut-off data, then passes once they are gone', () => {
            cy.visit('/en');
            applyViewport('phone-small');
            cy.get('h1').should('exist');

            cy.window({ log: false }).then((win) => {
                const document_ = win.document;
                const hidden = document_.createElement('button');
                hidden.id = 'touch-probe-hidden';
                hidden.textContent = 'Reveal';
                hidden.style.opacity = '0';
                const cut = document_.createElement('span');
                cut.id = 'touch-probe-cut';
                cut.title = 'f3a9c1d2-77aa-4c1e-9b0d-1234567890ab';
                cut.textContent = 'f3a9c1d2...';
                document_.body.append(hidden, cut);

                const kinds = gatedFindings(classifyTouchProbes(collectTouchProbes(win))).map(
                    ({ kind }) => kind
                );
                expect(kinds).to.include.members(['hidden-control', 'title-only-data']);

                hidden.remove();
                cut.remove();
                const after = gatedFindings(classifyTouchProbes(collectTouchProbes(win)));
                expect(after, 'the shell has nothing a finger cannot reach').to.deep.equal([]);
            });
        });
    });
});
