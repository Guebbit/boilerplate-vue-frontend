/// <reference types="cypress" />

/**
 * @module
 * The layout checks: what a phone, a tablet or a short screen does to a page that looked fine on
 * a desktop. They run inside the a11y sweep (`a11y-sweep.ts`), at each size of the matrix.
 *
 * ── Why geometry, and not "does the page scroll sideways" ────────────────────────────────────
 * Vuetify sets `html { overflow-x: hidden }`, so a too-wide element is cut off and unreachable,
 * not scrolled to. A check that waits for a scrollbar finds nothing. These read each element's
 * box instead and name the one that escapes.
 *
 * ── Split in two ─────────────────────────────────────────────────────────────────────────────
 * `collectLayoutFindings` reads the live page synchronously and returns plain data. The rules
 * that need no page (what blocks, how a case accepts a finding, how a failure reads) are in
 * `scripts/e2e/layout-findings.ts`, where Vitest reaches them. The algorithms, thresholds and
 * the false-positive table: `docs/tools/layout-sweep.md`.
 */
import {
    TEXT_200_CSS,
    TEXT_SPACING_CSS,
    applyAllowances,
    blockingFindings,
    gateMessage,
    type LayoutAllowance,
    type LayoutCheckId,
    type LayoutFinding,
    type LayoutMode
} from '../../../scripts/e2e/layout-findings';
import type { ViewportName } from '../../../scripts/e2e/viewports';
import { asStub } from '../stub';
import { waitForTransitions } from './commands';
import type { LayoutRecordRequest } from './layout-task';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's own typing contract: custom commands merge into its global namespace
    namespace Cypress {
        // The name belongs to the library being augmented, not to this codebase.
        interface Chainable {
            /**
             * Runs the layout checks on the page as it stands, records every finding to
             * `reports/a11y/<spec>.layout.json` and fails on the blocking ones.
             *
             * @param label - the audited state's name, the report entry's key
             * @param options - the size, the checks, the text mode and the case's allowances
             */
            checkLayout(label: string, options: CheckLayoutOptions): Chainable<void>;

            /**
             * Runs axe's `target-size` rule at the comfort tier (44 px, with the spacing allowance of
             * WCAG 2.5.8) and fails on its findings. Not WCAG 2.5.5: that criterion has no spacing
             * exception.
             *
             * @param label - the audited state's name
             */
            checkTargetComfort(label: string): Chainable<void>;
        }
    }
}

/** What a `cy.checkLayout` call is told. */
export interface CheckLayoutOptions {
    /** The matrix size the page is laid out at: it names the report entry and the allowances. */
    viewport: ViewportName;
    /** Which checks to run; all of them when absent. */
    checks?: readonly LayoutCheckId[];
    /** The text treatment; `normal` when absent. */
    mode?: LayoutMode;
    /** The case's acceptances of single elements. */
    allow?: readonly LayoutAllowance[];
    /** Run the input-font and scroll-x checks too: true below 600 px. */
    narrow?: boolean;
}

/** Name shared with the `recordLayoutFindings` task registered in `cypress.config.ts`. */
const LAYOUT_REPORT_TASK = 'recordLayoutFindings';

/** Pixels of slack on every edge comparison: sub-pixel layout rounds. */
const TOLERANCE = 1;

/** At most this many escape points are named per check; the rest are counted. */
const MAX_NAMED = 10;

/** The characters of an element's text a finding keeps. */
const TEXT_LENGTH = 40;

/** Elements a finger or a keyboard acts on. */
const CONTROL_SELECTOR =
    'a[href], button, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"]), [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab], [role=menuitem], [role=option]';

/** The widget roots a hit may belong to instead of the control's own element. */
const WIDGET_ROOT =
    '.v-input, .v-selection-control, .v-btn, .v-chip, .v-list-item, .v-field, label';

/** A Vuetify-generated id (`input-v-12`): different on every load, so useless in a report. */
const GENERATED_ID = /(?:^|-)v-\d+$/;

/** Input types that are not text fields. */
const NON_TEXT_INPUT = /^(?:hidden|checkbox|radio|range|color|file|button|submit|reset|image)$/;

/** The page's size and its fixed reference, read once per run. */
interface Page {
    win: Window;
    /** The width layout is judged against: scrollbar excluded (`clientWidth`, never `innerWidth`). */
    width: number;
    height: number;
}

/** A box in plain numbers, as a finding carries it. */
type Box = LayoutFinding['rect'];

/** Everything one run of the collector needs to say about a hit. */
interface Hit {
    check: LayoutCheckId;
    element: Element;
    detail: string;
    severity?: LayoutFinding['severity'];
}

/** The box of an element, as plain numbers. */
const boxOf = (element: Element): Box => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height)
    };
};

/**
 * A path to an element stable enough to find in the source.
 *
 * An id (unless Vuetify made it), else the nearest `data-test`, else the nearest landmark, then
 * up to three `tag.class` steps.
 *
 * @param element - the element to name
 */
export const describeElement = (element: Element): string => {
    if (element.id && !GENERATED_ID.test(element.id)) return `#${element.id}`;
    const test = element.closest('[data-test]');
    const anchor = test ?? element.closest('main, header, nav, [role=dialog]');
    const steps: string[] = [];
    for (let node: Element | null = element; node && node !== anchor; node = node.parentElement) {
        if (steps.length === 3 || node === element.ownerDocument.body) break;
        const classes = [...node.classList].slice(0, 2).join('.');
        const siblings = [...(node.parentElement?.children ?? [])].filter(
            (sibling) => sibling.tagName === node?.tagName
        );
        const nth =
            siblings.length > 1 ? `:nth-of-type(${String(siblings.indexOf(node) + 1)})` : '';
        steps.unshift(`${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}${nth}`);
    }
    // `dataset` lives on HTMLElement; an anchor found by `[data-test]` or by landmark tag is one
    // (an `instanceof` check would fail across the app window's realm).
    const testName = (anchor as HTMLElement | null)?.dataset.test;
    const head = anchor
        ? testName
            ? `[data-test=${testName}]`
            : anchor.tagName.toLowerCase()
        : '';
    return [head, ...steps].filter(Boolean).join(' ');
};

/** The text or accessible name of an element, cut short. */
const textOf = (element: Element): string =>
    (element.getAttribute('aria-label') ?? element.textContent ?? '')
        .replaceAll(/\s+/g, ' ')
        .trim()
        .slice(0, TEXT_LENGTH);

/** A finding for one hit, at the severity the hit asks for. */
const toFinding = (
    { check, element, detail, severity = 'blocking' }: Hit,
    mode: LayoutMode
): LayoutFinding => ({
    check,
    mode,
    severity,
    selector: describeElement(element),
    text: textOf(element),
    detail,
    rect: boxOf(element)
});

/** Whether an element or an ancestor is hidden from everyone: not worth a finding. */
const inHiddenSubtree = (element: Element): boolean =>
    Boolean(
        element.closest(
            '[aria-hidden="true"], [inert], .v-overlay:not(.v-overlay--active), .v-navigation-drawer:not(.v-navigation-drawer--active), .v-tooltip'
        )
    );

/** Whether an element is there to a screen reader only: 1 px, or clipped to nothing. */
const isVisuallyHidden = (element: Element, win: Window): boolean => {
    const box = element.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1) return true;
    const style = win.getComputedStyle(element);
    // The legacy `clip` is what Tailwind's `sr-only` uses to hide text from the eye only.
    return (
        style.getPropertyValue('clip') === 'rect(0px, 0px, 0px, 0px)' ||
        style.clipPath.startsWith('inset(50%')
    );
};

/** Whether a finding could be about this element at all. */
const countable = (element: Element, win: Window): boolean =>
    !inHiddenSubtree(element) &&
    !isVisuallyHidden(element, win) &&
    !element.matches('script, style, link, meta, head, title, noscript');

/** Every element the checks may report on. */
const candidates = (page: Page): Element[] =>
    [...page.win.document.body.querySelectorAll('*')].filter((element) =>
        countable(element, page.win)
    );

/** Whether `element` sits inside an ancestor that scrolls sideways, so its overflow is reachable. */
const inScrollContainer = (element: Element, win: Window): boolean => {
    for (
        let node = element.parentElement;
        node && node !== win.document.body;
        node = node.parentElement
    )
        if (['auto', 'scroll'].includes(win.getComputedStyle(node).overflowX)) return true;
    return false;
};

/** Elements wider than the screen, reported where the content leaves its container. */
const findOverflow = (page: Page): Hit[] => {
    const offenders = new Set(
        candidates(page).filter((element) => {
            const { left, right } = element.getBoundingClientRect();
            const past = right > page.width + TOLERANCE || (left < -TOLERANCE && right > 0);
            return (
                past &&
                page.win.getComputedStyle(element).position !== 'fixed' &&
                !inScrollContainer(element, page.win)
            );
        })
    );
    const escapes = [...offenders].filter(
        (element) => !element.parentElement || !offenders.has(element.parentElement)
    );
    const hits = escapes.slice(0, MAX_NAMED).map((element): Hit => {
        const { left, right } = element.getBoundingClientRect();
        const side =
            right > page.width + TOLERANCE
                ? `right edge ${String(Math.round(right))} > viewport ${String(page.width)}`
                : `left edge ${String(Math.round(left))} < 0`;
        const parent = element.parentElement ? describeElement(element.parentElement) : 'the page';
        return { check: 'overflow', element, detail: `${side}; escapes ${parent}` };
    });
    const { scrollWidth } = page.win.document.documentElement;
    if (hits.length === 0 && scrollWidth > page.width + TOLERANCE)
        hits.push({
            check: 'overflow',
            element: page.win.document.documentElement,
            detail: `page is ${String(scrollWidth - page.width)} px wider than the viewport`
        });
    if (escapes.length > MAX_NAMED && hits[0])
        hits[0].detail += ` (+${String(escapes.length - MAX_NAMED)} more)`;
    return hits;
};

/** Open dialogs, menus and drawers that do not fit the screen. */
const findOverlayFit = (page: Page): Hit[] =>
    [
        ...page.win.document.querySelectorAll(
            '.v-overlay--active:not(.v-tooltip) > .v-overlay__content, .v-navigation-drawer--active'
        )
    ].flatMap((element): Hit[] => {
        const { left, right, top, bottom } = element.getBoundingClientRect();
        const off: string[] = [];
        if (left < -TOLERANCE) off.push(`${String(Math.round(-left))} px off the left`);
        if (right > page.width + TOLERANCE)
            off.push(`${String(Math.round(right - page.width))} px off the right`);
        if (top < -TOLERANCE) off.push(`${String(Math.round(-top))} px off the top`);
        if (bottom > page.height + TOLERANCE)
            off.push(`${String(Math.round(bottom - page.height))} px off the bottom`);
        return off.length > 0
            ? [
                  {
                      check: 'overlay-fit',
                      element,
                      detail: `${String(Math.round(right - left))} × ${String(Math.round(bottom - top))} px at a ${String(page.width)} × ${String(page.height)} px viewport; ${off.join(', ')}`
                  }
              ]
            : [];
    });

/** Whether an element carries text of its own (not only inside a child). */
const hasOwnText = (element: Element): boolean =>
    [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''
    );

/**
 * What a clipping box cuts: its own text, or a descendant with text or a control that crosses
 * its edge. Media (an image, an icon) is reported as such: it has no words to lose.
 */
const cutContent = (
    clip: Element,
    win: Window
): { element: Element; media: boolean } | undefined => {
    if (hasOwnText(clip)) return { element: clip, media: false };
    const edge = clip.getBoundingClientRect();
    for (const child of clip.querySelectorAll('*')) {
        const box = child.getBoundingClientRect();
        const crosses =
            box.width > 0 &&
            (box.right > edge.right + TOLERANCE ||
                box.bottom > edge.bottom + TOLERANCE ||
                box.left < edge.left - TOLERANCE ||
                box.top < edge.top - TOLERANCE);
        if (!crosses || !countable(child, win)) continue;
        if (hasOwnText(child) || child.matches(CONTROL_SELECTOR))
            return { element: child, media: false };
        if (child.matches('img, svg, video, canvas')) return { element: child, media: true };
    }
    return undefined;
};

/** Boxes that cut their own content: text or a control that is there and cannot be seen. */
const findClipped = (page: Page, mode: LayoutMode): Hit[] =>
    candidates(page).flatMap((element): Hit[] => {
        const style = page.win.getComputedStyle(element);
        const clipsX = ['hidden', 'clip'].includes(style.overflowX);
        const clipsY = ['hidden', 'clip'].includes(style.overflowY);
        const cutX = clipsX && element.scrollWidth > element.clientWidth + TOLERANCE;
        const cutY = clipsY && element.scrollHeight > element.clientHeight + TOLERANCE;
        const byDesign = style.textOverflow === 'ellipsis' && cutX && !cutY;
        if ((!cutX && !cutY) || (byDesign && mode === 'normal')) return [];
        const cut = cutContent(element, page.win);
        if (!cut) return [];
        const amount = cutX
            ? `${String(element.scrollWidth - element.clientWidth)} px`
            : `${String(element.scrollHeight - element.clientHeight)} px`;
        return [
            {
                check: 'clipped',
                element,
                severity: cut.media || byDesign ? 'advisory' : 'blocking',
                detail: `clips ${amount} of ${describeElement(cut.element)} (text: "${textOf(cut.element)}")`
            }
        ];
    });

/** Fields below 16 px, which iOS zooms the page for on focus. */
const findInputFont = (page: Page): Hit[] =>
    [...page.win.document.querySelectorAll('input, select, textarea, [contenteditable=true]')]
        .filter((element) => {
            const type = element.getAttribute('type') ?? 'text';
            return (
                !NON_TEXT_INPUT.test(type) &&
                countable(element, page.win) &&
                Number.parseFloat(page.win.getComputedStyle(element).fontSize) < 16
            );
        })
        .map((element) => ({
            check: 'input-font' as const,
            element,
            detail: `font-size ${page.win.getComputedStyle(element).fontSize} < 16px: iOS zooms the page on focus`
        }));

/** Containers that still scroll sideways at a phone width: reflow was lost there. */
const findScrollX = (page: Page): Hit[] =>
    candidates(page)
        .filter(
            (element) =>
                ['auto', 'scroll'].includes(page.win.getComputedStyle(element).overflowX) &&
                element.scrollWidth > element.clientWidth + TOLERANCE &&
                !element.matches('.v-slide-group__container, .v-slide-group__content')
        )
        .map((element) => ({
            check: 'scroll-x' as const,
            element,
            severity: 'advisory' as const,
            detail: `scrolls sideways by ${String(element.scrollWidth - element.clientWidth)} px`
        }));

/** The topmost open dialog, menu or temporary drawer: while one is up, only it is in reach. */
const modalScope = (win: Window): Element | undefined => {
    const open = win.document.querySelectorAll(
        '.v-overlay--active:not(.v-tooltip) > .v-overlay__content, .v-navigation-drawer--active.v-navigation-drawer--temporary'
    );
    return [...open].at(-1);
};

/** The controls to test: shown, enabled, in reach, and not a hidden implementation detail. */
const reachableControls = (page: Page): Element[] => {
    const scope = modalScope(page.win);
    return [...page.win.document.querySelectorAll(CONTROL_SELECTOR)].filter((element) => {
        const style = page.win.getComputedStyle(element);
        const { left, right, top, bottom } = element.getBoundingClientRect();
        const offscreenSkipLink =
            style.position === 'fixed' &&
            (right <= 0 || left >= page.width || bottom <= 0 || top >= page.height);
        return (
            countable(element, page.win) &&
            !(element as HTMLButtonElement).disabled &&
            style.pointerEvents !== 'none' &&
            !offscreenSkipLink &&
            element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
            (!scope || scope.contains(element))
        );
    });
};

/** One scrolling box and the offsets it started at. */
interface Scroller {
    element: Element;
    left: number;
    top: number;
    /** The user cannot scroll it sideways: its horizontal overflow is hidden or clipped. */
    lockedX: boolean;
    /** The user cannot scroll it up and down: its vertical overflow is hidden or clipped. */
    lockedY: boolean;
}

/** Every box that can hold a scroll offset, recorded before anything is scrolled. */
const scrollersOf = (page: Page): Scroller[] =>
    // The page itself is not a scroller to guard: Vuetify clips `html` sideways, but the
    // visitor scrolls the page up and down, and the window offset is restored on its own.
    [...page.win.document.body.querySelectorAll('*')]
        .filter(
            (element) =>
                element.scrollWidth > element.clientWidth ||
                element.scrollHeight > element.clientHeight
        )
        .map((element) => ({
            element,
            left: element.scrollLeft,
            top: element.scrollTop,
            lockedX: ['hidden', 'clip'].includes(page.win.getComputedStyle(element).overflowX),
            lockedY: ['hidden', 'clip'].includes(page.win.getComputedStyle(element).overflowY)
        }));

/** The scrollers whose offset is no longer the one recorded. */
const movedScrollers = (scrollers: readonly Scroller[]): Scroller[] =>
    scrollers.filter(
        ({ element, left, top }) => element.scrollLeft !== left || element.scrollTop !== top
    );

/** Puts every scroller and the window back where they started. */
const restoreScrollers = (scrollers: readonly Scroller[], win: Window, start: Box): void => {
    for (const { element, left, top } of movedScrollers(scrollers)) {
        element.scrollLeft = left;
        element.scrollTop = top;
    }
    win.scrollTo({ left: start.x, top: start.y, behavior: 'instant' });
};

/** Whether the point's topmost element is the control, inside it, or part of the same widget. */
const isTheControl = (element: Element, hit: Element | null): boolean => {
    if (!hit) return false;
    if (element === hit || element.contains(hit) || hit.contains(element)) return true;
    const root = element.closest(WIDGET_ROOT);
    if (root && root === hit.closest(WIDGET_ROOT)) return true;
    return hit instanceof HTMLLabelElement && hit.control === element;
};

/**
 * The point a finger lands on: the centre of the part of the control that is on screen. A control
 * taller than the screen has its centre off it, where there is nothing to hit.
 */
const centreOf = (element: Element, page: Page): { x: number; y: number } => {
    const { left, right, top, bottom } = element.getBoundingClientRect();
    const [x0, x1] = [Math.max(left, 0), Math.min(right, page.width)];
    const [y0, y1] = [Math.max(top, 0), Math.min(bottom, page.height)];
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
};

/** Judges one control: reachable by scrolling something the user can scroll, and not covered. */
const judgeControl = (
    element: Element,
    page: Page,
    scrollers: readonly Scroller[]
): Hit | undefined => {
    const box = element.getBoundingClientRect();
    const inView =
        box.left >= 0 && box.top >= 0 && box.right <= page.width && box.bottom <= page.height;
    // Focus scrolls to a control and honours `scroll-padding`; so does this. Only when needed:
    // most controls are in view, and the scroll is the expensive step.
    if (!inView)
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    if (
        movedScrollers(scrollers).some(
            ({ element: box, left, top, lockedX, lockedY }) =>
                (lockedX && box.scrollLeft !== left) || (lockedY && box.scrollTop !== top)
        )
    )
        return {
            check: 'covered',
            element,
            detail: 'unreachable: only a container the user cannot scroll would bring it into view'
        };
    const { x, y } = centreOf(element, page);
    const hit = page.win.document.elementFromPoint(x, y);
    return isTheControl(element, hit)
        ? undefined
        : {
              check: 'covered',
              element,
              detail: `centre covered by ${hit ? describeElement(hit) : 'nothing'}`
          };
};

/** Controls a finger cannot get to: covered at the centre, or reachable only by an unscrollable box. */
const findCovered = (page: Page): Hit[] => {
    const scrollers = scrollersOf(page);
    const start: Box = { x: page.win.scrollX, y: page.win.scrollY, width: 0, height: 0 };
    return reachableControls(page).flatMap((element) => {
        const hit = judgeControl(element, page, scrollers);
        // The next control starts from the page the case left, not from where this one scrolled.
        restoreScrollers(scrollers, page.win, start);
        return hit ? [hit] : [];
    });
};

/** Runs one check and returns what is wrong. */
const runCheck = (check: LayoutCheckId, page: Page, mode: LayoutMode): Hit[] => {
    switch (check) {
        case 'overflow': {
            return findOverflow(page);
        }
        case 'overlay-fit': {
            return findOverlayFit(page);
        }
        case 'clipped': {
            return findClipped(page, mode);
        }
        case 'covered': {
            return findCovered(page);
        }
        case 'input-font': {
            return findInputFont(page);
        }
        case 'scroll-x': {
            return findScrollX(page);
        }
    }
};

/** The checks that only make sense on a phone-width screen. */
const NARROW_ONLY = new Set<LayoutCheckId>(['input-font', 'scroll-x']);

/** The order the checks run in: cheap and loud first; `covered` scrolls, so it goes last. */
const ORDER: readonly LayoutCheckId[] = [
    'overflow',
    'overlay-fit',
    'clipped',
    'input-font',
    'scroll-x',
    'covered'
];

/**
 * Reads the page and returns every layout finding, as plain data.
 *
 * Synchronous: the layout has settled before this runs, and a retry would only re-measure the
 * same thing. Exported so the planted-offender spec can drive it on a page it has doctored.
 *
 * @param win - the app's window
 * @param options - the checks to run, the text mode and whether this is a phone width
 * @returns The findings, in check order
 */
export const collectLayoutFindings = (
    win: Window,
    options: Pick<CheckLayoutOptions, 'checks' | 'mode' | 'narrow'> = {}
): LayoutFinding[] => {
    const mode = options.mode ?? 'normal';
    const page: Page = {
        win,
        width: win.document.documentElement.clientWidth,
        height: win.document.documentElement.clientHeight
    };
    const wanted = new Set(options.checks ?? ORDER);
    return ORDER.filter(
        (check) => wanted.has(check) && (options.narrow === true || !NARROW_ONLY.has(check))
    ).flatMap((check) => runCheck(check, page, mode).map((hit) => toFinding(hit, mode)));
};

/** Blocks until the page has laid out under a stylesheet just added or removed. */
const nextFrames = (win: Window): Promise<void> =>
    new Promise((resolve) => {
        // Two frames: the first applies the style, the second is the layout that followed.
        win.requestAnimationFrame(() => {
            win.requestAnimationFrame(() => {
                resolve();
            });
        });
    });

/**
 * Runs `measure` with a text treatment applied, then takes the treatment off.
 *
 * @param mode - `normal` runs as is
 * @param measure - the Cypress steps to run under the treatment
 */
export const withTextMode = (mode: LayoutMode, measure: () => void): void => {
    if (mode === 'normal') {
        measure();
        return;
    }
    const css = mode === 'text-spacing' ? TEXT_SPACING_CSS : TEXT_200_CSS;
    cy.window({ log: false }).then((win) => {
        const style = win.document.createElement('style');
        style.id = 'layout-text-mode';
        style.textContent = css;
        win.document.head.append(style);
        return new Cypress.Promise<void>((resolve) => {
            void nextFrames(win).then(resolve);
        });
    });
    measure();
    cy.window({ log: false }).then((win) => {
        win.document.querySelector('#layout-text-mode')?.remove();
        return new Cypress.Promise<void>((resolve) => {
            void nextFrames(win).then(resolve);
        });
    });
};

Cypress.Commands.add(
    'checkLayout',
    asStub<Cypress.CommandFn<'checkLayout'>>((label: string, options: CheckLayoutOptions) => {
        waitForTransitions();
        return cy.window({ log: false }).then((win) => {
            const mode = options.mode ?? 'normal';
            const found = collectLayoutFindings(win, options);
            const findings = applyAllowances(found, options.viewport, options.allow).map(
                (finding) =>
                    // The text-200 pass reports only (Q2.4): advisory whatever the check said.
                    mode === 'text-200' ? { ...finding, severity: 'advisory' as const } : finding
            );
            // Recorded before the gate throws, so a failing page's whole picture is in the report.
            cy.url({ log: false }).then((url) => {
                const request: LayoutRecordRequest = {
                    spec: Cypress.spec.relative,
                    context: `${label} @ ${options.viewport}${mode === 'normal' ? '' : ` · ${mode}`}`,
                    url,
                    findings
                };
                cy.task(LAYOUT_REPORT_TASK, request, { log: false });
            });
            cy.then(() => {
                const blocking = blockingFindings(findings);
                if (blocking.length > 0)
                    throw new Error(gateMessage(label, options.viewport, blocking));
            });
        });
    })
);

/** The comfort tier's size, in CSS px: Apple HIG's 44 pt, and Vuetify's `large` button. */
const COMFORT_SIZE = 44;

Cypress.Commands.add(
    'checkTargetComfort',
    asStub<Cypress.CommandFn<'checkTargetComfort'>>((label: string) => {
        waitForTransitions();
        cy.injectAxe();
        /*
         * cypress-axe: `configureAxe` is `axe.configure`. `target-size` passes a target at
         * `minSize`, or one with that much free space around it (`target-offset`): the
         * spacing allowance of WCAG 2.5.8. Both checks take the new size.
         * https://github.com/component-driven/cypress-axe#cyconfigureaxeconfigurationoptions
         */
        cy.configureAxe({
            checks: [
                { id: 'target-size', options: { minSize: COMFORT_SIZE } },
                { id: 'target-offset', options: { minOffset: COMFORT_SIZE } }
            ]
        });
        cy.checkA11y(
            undefined,
            { runOnly: { type: 'rule', values: ['target-size'] } },
            (violations) => {
                const nodes = violations.flatMap((violation) => violation.nodes);
                // Put the 24 px gate back for the next `checkPageA11y`.
                cy.window({ log: false }).then((win) => {
                    (win as Window & { axe?: { reset: () => void } }).axe?.reset();
                });
                if (nodes.length > 0)
                    throw new Error(
                        `[comfort ${label}] ${String(nodes.length)} target(s) under ${String(COMFORT_SIZE)} px with no room around them (WCAG 2.5.8 spacing allowance, not 2.5.5):\n` +
                            nodes
                                .map(({ target }) => `  ${target.map(String).join(' ')}`)
                                .join('\n')
                    );
            },
            true
        );
    })
);
