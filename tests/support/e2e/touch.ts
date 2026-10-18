/// <reference types="cypress" />

/**
 * @module
 * Touch emulation as typed commands: a finger on the page, the way a phone gives one.
 *
 * Headless Chromium has no touch screen, so a "phone" viewport alone still lays out for a mouse.
 * `applyViewport` switches this on for every viewport marked `touch`; a spec rarely calls it itself.
 *
 * Why a CDP call and not CSS: `Emulation.setTouchEmulationEnabled` flips `(hover: none)`,
 * `(pointer: coarse)` and `ontouchstart` live, so Vuetify's touch-only CSS applies. Measured on
 * Electron 37 and Chromium 154:
 *   - it leaks into the next TEST of the same spec, so a root `afterEach` resets it;
 *   - `{ enabled: false, maxTouchPoints: 0 }` throws, so reset sends `enabled: false` alone;
 *   - `setEmulatedMedia` for hover/pointer and `setDeviceMetricsOverride` are silent no-ops here,
 *     so neither is used, and `enableTouch` checks that the switch took.
 */
import { asStub } from '../stub';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        // The name belongs to the library being augmented, not to this codebase.
        interface Chainable {
            /**
             * Turns touch emulation on and checks that the page now reports a coarse pointer.
             * Chromium family only: elsewhere a "touch" case would prove nothing, so it throws.
             */
            enableTouch(): Chainable<void>;

            /** Turns touch emulation off if this spec turned it on; a no-op otherwise. */
            resetTouch(): Chainable<void>;

            /**
             * Asserts the subject can be touched: visible, enabled (form controls), and the
             * topmost element at its centre. Fails naming what covers it.
             */
            shouldBeTappable(): Chainable<JQuery>;

            /** A finger tap: {@link Chainable.shouldBeTappable}, then `realTouch`. */
            tap(): Chainable<JQuery>;

            /** Taps the page heading, a neutral spot: closes a sticky tooltip the way a person does. */
            tapAway(): Chainable<void>;
        }
    }
}

/** Whether this spec has turned touch on and not yet turned it off. */
let emulating = false;

/**
 * Sends one Chrome DevTools Protocol command through Cypress' own channel.
 * https://docs.cypress.io/api/cypress-api/automation
 * Protocol reference: https://chromedevtools.github.io/devtools-protocol/tot/Emulation/
 */
const sendCdp = (command: string, parameters?: Record<string, unknown>) =>
    cy.wrap(Cypress.automation('remote:debugger:protocol', { command, params: parameters }), {
        log: false
    });

/** The page's own answer to "is the primary pointer coarse?", read from the top window. */
const pointerIsCoarse = (): boolean => window.top?.matchMedia('(pointer: coarse)').matches ?? false;

/** Names the browser in a failure, so a silent no-op in a new Cypress is easy to place. */
const browserLabel = (): string =>
    `Cypress ${Cypress.version}, ${Cypress.browser.displayName} ${Cypress.browser.version}`;

Cypress.Commands.add(
    'enableTouch',
    asStub<Cypress.CommandFn<'enableTouch'>>(() => {
        if (!Cypress.isBrowser({ family: 'chromium' }))
            throw new Error(
                `enableTouch: touch emulation needs a Chromium-family browser (${browserLabel()}); a phone case that passes without touch proves nothing`
            );
        Cypress.log({ name: 'enableTouch', displayName: 'TOUCH', message: 'on' });
        // `enabled`: switch on. `maxTouchPoints`: how many fingers the page believes the screen
        // takes (5, a typical phone).
        return sendCdp('Emulation.setTouchEmulationEnabled', {
            enabled: true,
            maxTouchPoints: 5
        }).then(() => {
            emulating = true;
            // Some emulation calls answer OK and change nothing; this is the canary.
            expect(pointerIsCoarse(), `touch emulation took effect (${browserLabel()})`).to.equal(
                true
            );
        });
    })
);

Cypress.Commands.add(
    'resetTouch',
    asStub<Cypress.CommandFn<'resetTouch'>>(() => {
        if (!emulating) return cy.wrap(undefined, { log: false });
        Cypress.log({ name: 'resetTouch', displayName: 'TOUCH', message: 'off' });
        // `enabled: false` alone: adding `maxTouchPoints: 0` throws "Touch points must be between 1 and 16".
        return sendCdp('Emulation.setTouchEmulationEnabled', { enabled: false }).then(() => {
            emulating = false;
            expect(pointerIsCoarse(), `touch emulation ended (${browserLabel()})`).to.equal(false);
        });
    })
);

Cypress.Commands.add(
    'shouldBeTappable',
    { prevSubject: true },
    asStub<Cypress.CommandFn<'shouldBeTappable'>>((subject: JQuery) => {
        cy.wrap(subject, { log: false }).should('be.visible');
        if (subject.is('button, input, select, textarea'))
            cy.wrap(subject, { log: false }).should('not.be.disabled');
        cy.wrap(subject, { log: false }).scrollIntoView();
        return cy.wrap(subject, { log: false }).then(($element) => {
            const element = $element.get(0);
            if (!element) throw new Error('shouldBeTappable: the subject is empty');
            const box = element.getBoundingClientRect();
            const hit = element.ownerDocument.elementFromPoint(
                box.left + box.width / 2,
                box.top + box.height / 2
            );
            // The topmost element must be the subject or inside it; anything else covers it.
            if (!hit || !(element === hit || element.contains(hit)))
                throw new Error(
                    `shouldBeTappable: ${element.tagName.toLowerCase()} is covered by ${hit ? hit.tagName.toLowerCase() + (hit.getAttribute('class') ? `.${(hit.getAttribute('class') ?? '').split(' ').join('.')}` : '') : 'nothing'}`
                );
            return $element;
        });
    })
);

Cypress.Commands.add(
    'tap',
    { prevSubject: true },
    asStub<Cypress.CommandFn<'tap'>>((subject: JQuery) =>
        // `realTouch` (cypress-real-events) sends CDP touch input but checks nothing itself,
        // so the actionability checks come first.
        cy.wrap(subject, { log: false }).shouldBeTappable().realTouch()
    )
);

Cypress.Commands.add(
    'tapAway',
    asStub<Cypress.CommandFn<'tapAway'>>(() => {
        cy.get('h1').first().realTouch();
        return cy.wrap(undefined, { log: false });
    })
);

// Touch emulation leaks into the next test of the same spec, so every test starts without it.
afterEach(() => {
    cy.resetTouch();
});
