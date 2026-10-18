/**
 * @module
 * The touch-reachability rules, as a pure classifier: what a finger cannot reach on a page.
 *
 * `collectTouchProbes` (in `tests/support/e2e/touch.ts`) turns the live page into plain
 * `TouchProbe` records; this turns records into findings. Splitting them keeps the rules unit
 * testable with no DOM. Why a finger cannot hover: `docs/theory/design-system.md`.
 */

/** What the collector read off one element. Plain data: no DOM node survives into a record. */
export interface TouchProbe {
    /** A short, human-readable path to the element, for the report. */
    selector: string;
    /** The element is a link, button, field or ARIA control. */
    isControl: boolean;
    /** A control that is on screen, enabled for the tree and not inside a closed overlay. */
    interactive: boolean;
    /** The product of `opacity` up the ancestors: 0 hides it, 1 shows it. */
    opacity: number;
    /** The computed `visibility` of the element. */
    visibility: string;
    /** The visible input of a Vuetify checkbox, radio or switch: the glyph beside it is the control. */
    selectionControlInput: boolean;
    /** A file input behind a Vuetify file-input: the button beside it is the control. */
    fileInput: boolean;
    /** The native `title` attribute, empty when there is none. */
    title: string;
    /** The text the element shows, trimmed. */
    text: string;
    /** The text is cut by CSS: the box is smaller than its content. */
    clipped: boolean;
    /** The accessible name: `aria-label`, else the visible text. */
    accessibleName: string;
    /** An `aria-describedby` points at a Vuetify tooltip. */
    describedByTooltip: boolean;
}

/** The ways a page can hide something from a finger. */
export type TouchFindingKind =
    'hidden-control' | 'title-only-data' | 'title-only-hint' | 'tooltip-on-non-control';

/** One rule's hit, with the elements it covers grouped. */
export interface TouchFinding {
    kind: TouchFindingKind;
    /** What was hidden: the title text, or the control's selector. */
    detail: string;
    /** How many elements hit the same rule with the same detail. */
    count: number;
    /** Up to three of them, enough to find the spot. */
    selectors: string[];
}

/** The kinds that fail a test. A hint is recorded and not gated: someone triages it. */
export const GATED_KINDS: readonly TouchFindingKind[] = [
    'hidden-control',
    'title-only-data',
    'tooltip-on-non-control'
];

/** Below this effective opacity a control is, for a finger, not there. */
const HIDDEN_OPACITY = 0.1;

/** Selectors printed per finding. */
const SELECTORS_PER_FINDING = 3;

/** A trailing `...` or `…`: the sign a string was cut in JavaScript. */
const TRAILING_ELLIPSIS = /(?:\.{3}|\u2026)$/;

/**
 * Whether the title holds data the element does not show.
 *
 * Two shapes: the element is clipped by CSS, or its visible text is the title cut short with an
 * ellipsis (the cut happened in JavaScript, so CSS clipping never sees it).
 */
const holdsDataOnlyInTitle = (probe: TouchProbe): boolean => {
    if (probe.clipped) return true;
    const stem = probe.text.replace(TRAILING_ELLIPSIS, '');
    return stem.length > 0 && stem.length < probe.title.length && probe.title.startsWith(stem);
};

/** The kind a probe's title belongs to, or undefined when the title adds nothing hidden. */
const titleKind = (probe: TouchProbe): TouchFindingKind | undefined => {
    if (probe.title === '' || probe.text.includes(probe.title)) return undefined;
    if (holdsDataOnlyInTitle(probe)) return 'title-only-data';
    // A control whose name already says the title (an icon button titled like its label) is fine.
    if (probe.isControl && probe.accessibleName.includes(probe.title)) return undefined;
    return 'title-only-hint';
};

/** The (kind, detail) pairs one probe breaks. */
const hitsOf = (probe: TouchProbe): { kind: TouchFindingKind; detail: string }[] => {
    const hits: { kind: TouchFindingKind; detail: string }[] = [];
    const hiddenFromFinger = probe.opacity < HIDDEN_OPACITY || probe.visibility === 'hidden';
    if (probe.interactive && hiddenFromFinger && !probe.selectionControlInput && !probe.fileInput)
        hits.push({ kind: 'hidden-control', detail: probe.selector });
    const kind = titleKind(probe);
    if (kind) hits.push({ kind, detail: probe.title });
    if (probe.describedByTooltip && !probe.isControl)
        hits.push({ kind: 'tooltip-on-non-control', detail: probe.selector });
    return hits;
};

/**
 * Applies the four rules to a page's probes.
 *
 * Findings with the same kind and detail are grouped: a dictionary of identical cells would
 * otherwise repeat one hint a hundred times.
 *
 * @param probes - the page, as the collector read it
 * @returns one finding per distinct (kind, detail), in first-seen order
 */
export const classifyTouchProbes = (probes: readonly TouchProbe[]): TouchFinding[] => {
    const grouped = new Map<string, TouchFinding>();
    for (const probe of probes)
        for (const { kind, detail } of hitsOf(probe)) {
            const key = `${kind}\u0000${detail}`;
            const known = grouped.get(key);
            if (known) {
                known.count += 1;
                if (known.selectors.length < SELECTORS_PER_FINDING)
                    known.selectors.push(probe.selector);
            } else grouped.set(key, { kind, detail, count: 1, selectors: [probe.selector] });
        }
    return [...grouped.values()];
};

/**
 * The findings that fail a test.
 *
 * @param findings - the classifier's output
 * @returns those of a gated kind
 */
export const gatedFindings = (findings: readonly TouchFinding[]): TouchFinding[] =>
    findings.filter(({ kind }) => GATED_KINDS.includes(kind));
