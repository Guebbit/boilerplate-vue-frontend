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
import {
    classifyTouchProbes,
    gatedFindings,
    type TouchProbe
} from '../../../scripts/e2e/touch-findings';
import { asStub } from '../stub';
import { waitForTransitions } from './commands';
import type { TouchRecordRequest } from './touch-task';

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

            /**
             * Scans the page for what a finger cannot reach (a control a hover reveals, data only a
             * `title` holds, a tooltip on a non-control), records every finding to
             * `reports/touch/<spec>.json` and fails on the gated kinds.
             * @param context - the label of the audited state, the report entry's key
             */
            checkTouchReachable(context: string): Chainable<void>;
        }
    }
}

/** Name shared with the `recordTouchFindings` task registered in `cypress.config.ts`. */
const TOUCH_REPORT_TASK = 'recordTouchFindings';

/** Elements a finger can press: the scan's notion of a control. */
const CONTROL_SELECTOR =
    'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=menuitem], [role=tab], [role=checkbox], [role=switch], [tabindex]:not([tabindex="-1"])';

/** Elements the scan reads: every control, plus anything carrying a `title` or a tooltip. */
const PROBED_SELECTOR = `${CONTROL_SELECTOR}, [title], [aria-describedby^="v-tooltip-"]`;

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

/** A short path to an element for the report: tag, id or `data-test`, first classes. */
const describeElement = (element: Element): string => {
    const id = element.id ? `#${element.id}` : '';
    const { test } = (element as HTMLElement).dataset;
    const classes = [...element.classList].slice(0, 2).join('.');
    return `${element.tagName.toLowerCase()}${id}${test ? `[data-test=${test}]` : ''}${classes ? `.${classes}` : ''}`;
};

/** The product of `opacity` from the element up to the root: 0 anywhere up the chain hides it. */
const effectiveOpacity = (element: Element, win: Window): number => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement)
        opacity *= Number(win.getComputedStyle(node).opacity);
    return opacity;
};

/** Whether a control is on screen and in the tree: a box, not inert, not in a closed overlay. */
const isInteractive = (element: Element): boolean => {
    const box = element.getBoundingClientRect();
    return (
        box.width > 0 &&
        box.height > 0 &&
        !element.closest('[inert], [aria-hidden="true"]') &&
        !element.closest('.v-overlay:not(.v-overlay--active)')
    );
};

/**
 * Reads the page into plain records for the classifier.
 *
 * Exported so the shell spec can drive it on a page it has just doctored.
 *
 * @param win - the app's window
 * @returns one record per control, titled element or tooltip target
 */
export const collectTouchProbes = (win: Window): TouchProbe[] =>
    [...win.document.querySelectorAll(PROBED_SELECTOR)]
        // Frames, SVG and abbreviations carry a `title` of their own kind: not this scan's concern.
        .filter((element) => !element.matches('iframe, abbr') && !element.closest('svg'))
        .map((element): TouchProbe => {
            const html = element as HTMLElement;
            const text = (element.textContent ?? '').trim();
            const isControl = element.matches(CONTROL_SELECTOR);
            return {
                selector: describeElement(element),
                isControl,
                interactive: isControl && isInteractive(element),
                opacity: effectiveOpacity(element, win),
                visibility: win.getComputedStyle(element).visibility,
                selectionControlInput: Boolean(element.closest('.v-selection-control__input')),
                fileInput: element.matches('input[type=file]'),
                fieldInput:
                    element.matches('input, textarea') && Boolean(element.closest('.v-field')),
                title: element.getAttribute('title') ?? '',
                text,
                clipped:
                    html.scrollWidth > html.clientWidth + 1 ||
                    html.scrollHeight > html.clientHeight + 1,
                accessibleName: element.getAttribute('aria-label') ?? text,
                describedByTooltip: Boolean(
                    element.getAttribute('aria-describedby')?.startsWith('v-tooltip-')
                )
            };
        });

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
        // Scrolled before the visibility check: Cypress calls an element clipped by a scrolling
        // container (a long drawer) not visible, and a finger would scroll to it first.
        // Centred, not top-aligned: a top-aligned element sits under the sticky app bar, where
        // the hit test below would then (rightly) call it covered.
        // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
        cy.wrap(subject, { log: false }).then(($element) => {
            $element.get(0)?.scrollIntoView({ block: 'center', inline: 'center' });
        });
        cy.wrap(subject, { log: false }).should('be.visible');
        if (subject.is('button, input, select, textarea'))
            cy.wrap(subject, { log: false }).should('not.be.disabled');
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

/** Frames an element's box must hold still for before a finger lands on it. */
const STABLE_FRAMES = 2;

/** How many times a still-moving element is re-measured before the tap goes ahead anyway. */
const SETTLE_ATTEMPTS = 20;

/** Whether two boxes sit in the same place at the same size. */
const sameBox = (a?: DOMRect, b?: DOMRect): boolean =>
    a?.x === b?.x && a?.y === b?.y && a?.width === b?.width && a?.height === b?.height;

/**
 * Resolves with the subject once its box has not moved for {@link STABLE_FRAMES} frames.
 *
 * Cypress' own `.click()` waits for an element to stop animating; `realTouch` does not, and a
 * bar that re-flows when a late icon (the bell) arrives would send the finger to the neighbour.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
 */
const settled = (subject: JQuery): Cypress.Chainable<JQuery> =>
    cy.window({ log: false }).then(
        (win) =>
            new Cypress.Promise<JQuery>((resolve) => {
                const check = (before: DOMRect | undefined, frames: number, attempts: number) =>
                    win.requestAnimationFrame(() => {
                        const now = subject.get(0)?.getBoundingClientRect();
                        if (!sameBox(before, now) && attempts > 0)
                            check(now, STABLE_FRAMES, attempts - 1);
                        else if (frames > 1) check(now, frames - 1, attempts);
                        else resolve(subject);
                    });
                check(subject.get(0)?.getBoundingClientRect(), STABLE_FRAMES, SETTLE_ATTEMPTS);
            })
    );

Cypress.Commands.add(
    'tap',
    { prevSubject: true },
    asStub<Cypress.CommandFn<'tap'>>((subject: JQuery) =>
        // `realTouch` (cypress-real-events) sends CDP touch input but checks nothing itself,
        // so the actionability checks come first, then a wait for the box to hold still.
        cy.wrap(subject, { log: false }).shouldBeTappable().then(settled).realTouch()
    )
);

Cypress.Commands.add(
    'tapAway',
    asStub<Cypress.CommandFn<'tapAway'>>(() => {
        cy.get('h1').first().realTouch();
        return cy.wrap(undefined, { log: false });
    })
);

Cypress.Commands.add(
    'checkTouchReachable',
    asStub<Cypress.CommandFn<'checkTouchReachable'>>((context: string) => {
        waitForTransitions();
        return cy.window({ log: false }).then((win) => {
            const findings = classifyTouchProbes(collectTouchProbes(win));
            // Recorded before the gate throws, so a failing page's whole picture is in the report.
            cy.url({ log: false }).then((url) => {
                const request: TouchRecordRequest = {
                    spec: Cypress.spec.relative,
                    context,
                    url,
                    findings
                };
                cy.task(TOUCH_REPORT_TASK, request, { log: false });
            });
            cy.then(() => {
                const blocking = gatedFindings(findings);
                if (blocking.length > 0)
                    throw new Error(
                        `[touch ${context}] ${String(blocking.length)} thing(s) a finger cannot reach:\n` +
                            blocking
                                .map(
                                    ({ kind, detail, count, selectors }) =>
                                        `  ${kind}: ${detail} (${String(count)}× ${selectors.join(', ')})`
                                )
                                .join('\n')
                    );
            });
        });
    })
);

// Touch emulation leaks into the next test of the same spec, so every test starts without it.
afterEach(() => {
    cy.resetTouch();
});
