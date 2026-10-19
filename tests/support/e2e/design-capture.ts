/// <reference types="cypress" />

/**
 * @module
 * `cy.captureDesign()`: photograph the page the way a reviewer needs it, in pieces a model reads.
 *
 * Why:      an AI cannot open a browser, but it can read a PNG and a `.vue` file. This command
 *           makes the PNG; the Node tasks in `scripts/audit/design-manual/scripts/capture-task.ts`
 *           stitch and tile it. Nothing here asserts on the design: capture is evidence, not a test.
 * Flow:     freeze the page, measure it, scroll and shoot it in viewport pieces, check each piece
 *           is the viewport's size, read what a picture cannot show, then hand the pieces to Node.
 * Reading:  `docs/tools/design-review.md`.
 */
import { shotSizeProblem } from '../../../scripts/e2e/shot-size';
import { VIEWPORTS, type ViewportName } from '../../../scripts/e2e/viewports';
import type {
    DesignShot,
    InputFact,
    PageGeometry
} from '../../../scripts/audit/design-manual/scripts/manifest';
import type {
    RecordShotRequest,
    StitchRequest
} from '../../../scripts/audit/design-manual/scripts/capture-task';
import {
    bandsOf,
    stepsFor,
    type FixedBox
} from '../../../scripts/audit/design-manual/scripts/bands';
import { moduleOfSpec } from '../../../scripts/audit/design-manual/scripts/capture-matrix';

/**
 * What a sweep knows about a shot before the page is photographed.
 */
export interface CaptureRequest {
    /** The stable id from the capture matrix. */
    id: string;
    /** The case's human name. */
    caseName: string;
    /** The size the page is laid out at. */
    viewport: ViewportName;
    /** The theme the page is in (asserted by the caller). */
    theme: 'light' | 'dark';
    /** The locale prefix visited. */
    locale: string;
    /** Who was signed in: `anonymous` or an e2e persona. */
    role: string;
    /** How the state was reached. */
    state: DesignShot['state'];
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        // The name belongs to the library being augmented, not to this codebase.
        interface Chainable {
            /**
             * Photographs the page in viewport pieces, stitches them into tiles and records the
             * shot in the capture manifest. Never fails the test over the design itself; a piece
             * of the wrong size does fail it, since a clamped shot would be reviewed as a crop.
             * @param request - the identity of the shot
             */
            captureDesign(request: CaptureRequest): Chainable<void>;
        }
    }
}

/** An element the page can be scrolled by: the document, or a fullscreen overlay's scroller. */
interface Scroller {
    /** The element whose `scrollTop` moves the page. */
    element: Element;
    /** Its full scrollable height. */
    scrollHeight: number;
    /** Its `scrollWidth`. */
    scrollWidth: number;
    /** Its `clientWidth`. */
    clientWidth: number;
}

/** Everything measured from the DOM before the first piece is shot. */
interface Measured {
    /** What scrolls, or null when the page cannot scroll (one piece is the whole shot). */
    scroller: Scroller | null;
    /** Every visible fixed element, with the attribute that finds it again. */
    fixed: (FixedBox & { handle: string })[];
    /** Whether a sticky in-flow element will repeat across the pieces. */
    stickyRepeats: boolean;
    /** Controls the phone keyboard cares about. */
    inputs: InputFact[];
    /** The `h1`-`h3` outline. */
    headings: DesignShot['headings'];
}

/** The attribute the measurement stamps on a fixed element so it can be hidden by name. */
const FIXED_ATTRIBUTE = 'data-design-capture-fixed';

/** A short, findable name for an element: tag, id or `data-test`, first classes. */
const describeElement = (element: Element): string => {
    const id = element.id ? `#${element.id}` : '';
    const { test } = (element as HTMLElement).dataset;
    const classes = [...element.classList].slice(0, 2).join('.');
    return `${element.tagName.toLowerCase()}${id}${test ? `[data-test=${test}]` : ''}${classes ? `.${classes}` : ''}`;
};

/** Whether an element has a box and is not hidden by `display`, `visibility` or `opacity: 0`. */
const isVisible = (element: Element, win: Window): boolean => {
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return false;
    const style = win.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
};

/** The nearest ancestor that scrolls on its own, or null when only the document does. */
const ownScroller = (element: Element, win: Window): Element | null => {
    for (let node = element.parentElement; node; node = node.parentElement) {
        const { overflowY } = win.getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
    }
    return null;
};

/**
 * The element that scrolls the page being photographed.
 *
 * An active overlay that fills the viewport (a fullscreen dialog) scrolls inside itself, not the
 * window, so its scroller is used. Any other overlay (a menu, an open drawer) leaves the document
 * blocked and the page is one piece. Otherwise the document scrolls.
 */
const findScroller = (win: Window): Scroller | null => {
    const document_ = win.document;
    const fillsViewport = (element: Element): boolean => {
        const box = element.getBoundingClientRect();
        return box.width >= win.innerWidth - 1 && box.height >= win.innerHeight - 1;
    };

    // An open temporary navigation drawer blocks the page behind its scrim like an overlay does,
    // but it is not a `.v-overlay`.
    const overlays = [
        ...document_.querySelectorAll(
            '.v-overlay--active, .v-navigation-drawer--temporary.v-navigation-drawer--active'
        )
    ];
    if (overlays.length > 0) {
        const scroller = overlays
            .flatMap((overlay) => [overlay, ...overlay.querySelectorAll('*')])
            .findLast(
                (element) =>
                    element.scrollHeight > element.clientHeight + 1 &&
                    ['auto', 'scroll'].includes(win.getComputedStyle(element).overflowY) &&
                    fillsViewport(element)
            );
        if (!scroller) return null;
        return {
            element: scroller,
            scrollHeight: scroller.scrollHeight,
            scrollWidth: scroller.scrollWidth,
            clientWidth: scroller.clientWidth
        };
    }

    const root = document_.scrollingElement ?? document_.documentElement;
    if (root.scrollHeight <= win.innerHeight + 1) return null;
    return {
        element: root,
        scrollHeight: root.scrollHeight,
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth
    };
};

/** The visible text of the label a control answers to, or an empty string. */
const labelOf = (control: Element): string => {
    const aria = control.getAttribute('aria-label');
    if (aria) return aria;
    const { id, ownerDocument } = control;
    const explicit = id ? ownerDocument.querySelector(`label[for="${id}"]`) : null;
    const field = control.closest('.v-input');
    const text = explicit ?? field?.querySelector('.v-label, label') ?? null;
    return text?.textContent.trim() ?? control.getAttribute('placeholder') ?? '';
};

/** What the visible form controls ask of a phone keyboard. */
const inputsOf = (win: Window): InputFact[] =>
    [...win.document.querySelectorAll('input:not([type=hidden]), textarea, select')]
        .filter((control) => isVisible(control, win) || control.closest('.v-field'))
        .map((control) => ({
            label: labelOf(control),
            type: control.getAttribute('type') ?? control.tagName.toLowerCase(),
            inputmode: control.getAttribute('inputmode'),
            autocomplete: control.getAttribute('autocomplete'),
            enterkeyhint: control.getAttribute('enterkeyhint')
        }));

/** The `h1`-`h3` outline in document order. */
const headingsOf = (win: Window): DesignShot['headings'] =>
    [...win.document.querySelectorAll('h1, h2, h3')]
        .filter((heading) => isVisible(heading, win))
        .map((heading) => ({
            // The selector admits h1-h3 only, so the digit is 1, 2 or 3; the compiler cannot see it.
            level: Number(heading.tagName.slice(1)) as 1 | 2 | 3,
            text: heading.textContent.trim().replaceAll(/\s+/g, ' ')
        }));

/**
 * Reads the page into the facts the capture needs.
 *
 * Also stamps {@link FIXED_ATTRIBUTE} on every visible fixed element, so the ones that are not
 * bands can be hidden after the first piece.
 */
const measure = (win: Window): Measured => {
    const document_ = win.document;
    const fixed: Measured['fixed'] = [];
    let stickyRepeats = false;
    const scroller = findScroller(win);

    for (const element of document_.body.querySelectorAll('*')) {
        const { position } = win.getComputedStyle(element);
        if (position !== 'fixed' && position !== 'sticky') continue;
        if (!isVisible(element, win)) continue;

        if (position === 'sticky') {
            // A sticky element inside its own scroll area stays put there; only one that sticks
            // to the document repeats across pieces.
            if (!ownScroller(element, win)) stickyRepeats = true;
            continue;
        }

        const box = element.getBoundingClientRect();
        // The skip link sits off screen until focused: no height on screen, nothing to hide.
        // A closed temporary drawer is translated off screen but keeps its box: not on the picture.
        const onScreen =
            box.bottom > 0 &&
            box.top < win.innerHeight &&
            box.right > 0 &&
            box.left < win.innerWidth;
        if (!onScreen) continue;
        const handle = String(fixed.length);
        element.setAttribute(FIXED_ATTRIBUTE, handle);
        fixed.push({
            selector: describeElement(element),
            top: Math.round(box.top),
            height: Math.round(box.height),
            width: Math.round(box.width),
            handle
        });
    }

    return {
        scroller,
        fixed,
        stickyRepeats,
        inputs: inputsOf(win),
        headings: headingsOf(win)
    };
};

/** Waits until every image on screen has finished loading (lazy images load on intersection). */
const waitForVisibleImages = (): void => {
    cy.get('body', { log: false }).should(($body) => {
        const win = $body[0]?.ownerDocument.defaultView;
        if (!win) return;
        const pending = [...win.document.querySelectorAll('img')].filter((image) => {
            const box = image.getBoundingClientRect();
            const onScreen = box.bottom > 0 && box.top < win.innerHeight && box.width > 0;
            return onScreen && !image.complete;
        });
        expect(pending.length, 'images on screen still loading').to.equal(0);
    });
};

/** Hides every measured fixed element that is not a band: a toast shows once, in the first piece. */
const hideNonBands = (bandHandles: ReadonlySet<string>, handles: readonly string[]): void => {
    const hidden = handles.filter((handle) => !bandHandles.has(handle));
    if (hidden.length === 0) return;
    cy.document({ log: false }).then((document_) => {
        const style = document_.createElement('style');
        style.dataset.testid = 'design-capture-hide';
        style.textContent = `${hidden
            .map((handle) => `[${FIXED_ATTRIBUTE}="${handle}"]`)
            .join(', ')} { visibility: hidden !important; }`;
        document_.head.append(style);
    });
};

/**
 * Shoots one piece of the page and hands back where Cypress put it and what scroll it was at.
 *
 * @param name - the screenshot's file name
 * @param offset - the scroll position to ask for; null shoots without scrolling
 * @param scroller - what scrolls the page
 * @param loading - a loading state keeps requests open on purpose, so it does not wait for them
 * @param pieces - collects each piece: the path comes from `onAfterScreenshot`, never rebuilt
 */
const shootPiece = (
    name: string,
    offset: number | null,
    scroller: Scroller | null,
    loading: boolean,
    pieces: { path: string; scrollY: number; width: number; height: number }[]
): void => {
    let scrollY = 0;
    if (scroller && offset !== null)
        cy.window({ log: false }).then(() => {
            // `instant` skips smooth scrolling, so the position is final when it returns.
            // https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo
            scroller.element.scrollTo({ top: offset, behavior: 'instant' });
            scrollY = scroller.element.scrollTop;
        });

    waitForVisibleImages();
    if (!loading) cy.settleNetwork();

    let path = '';
    let width = 0;
    let height = 0;
    // https://docs.cypress.io/api/commands/screenshot#Arguments
    cy.screenshot(name, {
        capture: 'viewport',
        overwrite: true,
        onAfterScreenshot: (_element, details) => {
            path = details.path;
            ({ width, height } = details.dimensions);
        }
    });
    cy.then(() => {
        pieces.push({ path, scrollY, width, height });
    });
};

/**
 * Turns the measurements into the manifest row's page geometry.
 */
const geometryOf = (
    measured: Measured,
    bands: { bandTop: number; bandBottom: number },
    pageHeight: number,
    viewportWidth: number
): PageGeometry => ({
    height: pageHeight,
    scrollWidth: measured.scroller?.scrollWidth ?? viewportWidth,
    clientWidth: measured.scroller?.clientWidth ?? viewportWidth,
    bandTop: bands.bandTop,
    bandBottom: bands.bandBottom,
    stickyRepeats: measured.stickyRepeats
});

Cypress.Commands.add('captureDesign', (request: CaptureRequest) => {
    const { width: viewportWidth, height: viewportHeight } = VIEWPORTS[request.viewport];
    const loading = request.state === 'loading';

    cy.freezeForVisual();
    if (request.state === 'first-paint')
        // Leaving the theme toggle's drawer or a click behind leaves a focus ring on the picture.
        cy.document({ log: false }).then((document_) => {
            (document_.activeElement as HTMLElement | null)?.blur();
        });
    // The consent banner is hidden by the `analyticsConsent` cookie and tours by the AUT config,
    // so no overlay of the app's own is left to cover a shot.

    cy.window({ log: false }).then((win) => {
        const measured = measure(win);
        const viewport = { width: win.innerWidth, height: win.innerHeight };
        const bands = bandsOf(measured.fixed, viewport);
        const bandHandles = new Set(
            measured.fixed
                .filter(
                    (box) =>
                        (box.top <= 0 || box.top + box.height >= viewport.height) &&
                        box.width >= viewport.width / 2
                )
                .map((box) => box.handle)
        );
        const pageHeight = measured.scroller
            ? Math.max(measured.scroller.scrollHeight, viewport.height)
            : viewport.height;
        const offsets = measured.scroller
            ? stepsFor(pageHeight, viewport.height, bands.bandTop, bands.bandBottom)
            : [null];
        const pieces: { path: string; scrollY: number; width: number; height: number }[] = [];

        for (const [index, offset] of offsets.entries()) {
            shootPiece(
                `${request.id}--piece-${String(index)}`,
                offset,
                measured.scroller,
                loading,
                pieces
            );
            if (index === 0)
                hideNonBands(
                    bandHandles,
                    measured.fixed.map((box) => box.handle)
                );
        }

        cy.then(() => {
            // A clamped or retina shot is judged as a cropped page, so it fails loudly instead.
            for (const piece of pieces) {
                const problem = shotSizeProblem(
                    { width: piece.width, height: piece.height },
                    { width: viewportWidth, height: viewportHeight }
                );
                if (problem) throw new Error(`[design-capture] ${request.id}: ${problem}`);
            }

            const stitch: StitchRequest = {
                shotId: request.id,
                segments: pieces.map(({ path, scrollY }) => ({ path, scrollY })),
                bandTop: bands.bandTop,
                bandBottom: bands.bandBottom,
                pageHeight
            };
            return cy.task('stitchDesignCapture', stitch).then((tiles) => {
                const spec = Cypress.spec.relative;
                const shot: DesignShot = {
                    id: request.id,
                    module: moduleOfSpec(spec),
                    spec,
                    caseName: request.caseName,
                    route: new URL(win.location.href).pathname,
                    role: request.role,
                    viewport: request.viewport,
                    size: [viewportWidth, viewportHeight],
                    touch: VIEWPORTS[request.viewport].touch,
                    theme: request.theme,
                    locale: request.locale,
                    state: request.state,
                    // `cy.task` yields `unknown`; the task returns exactly `DesignTile[]`.
                    tiles: tiles as DesignShot['tiles'],
                    page: geometryOf(measured, bands, pageHeight, viewportWidth),
                    fixed: measured.fixed
                        .filter((box) => !bandHandles.has(box.handle))
                        .map(({ selector, top, height }) => ({ selector, top, height })),
                    inputs: measured.inputs,
                    headings: measured.headings
                };
                const row: RecordShotRequest = {
                    spec: spec.replaceAll(/[^\d.A-Za-z]+/g, '-'),
                    shot
                };
                return cy.task('recordDesignShot', row);
            });
        });
    });
});
