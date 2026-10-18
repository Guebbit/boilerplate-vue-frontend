/**
 * @module
 * The layout sweep's rules that need no browser: what a finding is, which are blocking, how a
 * case accepts one, and how a failure reads.
 *
 * `collectLayoutFindings` (in `tests/support/e2e/layout-checks.ts`) turns a live page into
 * findings; this judges them. Splitting them keeps the rules unit testable with no DOM.
 * What each check means, and why: `docs/tools/layout-sweep.md`.
 */
import type { ViewportName } from './viewports';

/** The checks, by the name a finding and an allowance carry. */
export type LayoutCheckId =
    'overflow' | 'overlay-fit' | 'clipped' | 'covered' | 'input-font' | 'scroll-x';

/** The text treatment the page was in when the check ran. */
export type LayoutMode = 'normal' | 'text-spacing' | 'text-200';

/** One thing wrong with the layout, as plain data: no DOM node survives into a finding. */
export interface LayoutFinding {
    check: LayoutCheckId;
    mode: LayoutMode;
    /** `blocking` fails the run; `advisory` is only written to the report. */
    severity: 'blocking' | 'advisory';
    /** A path to the element stable enough to find it in the source. */
    selector: string;
    /** The first 40 characters of the element's text or accessible name. */
    text: string;
    /** One line: what is wrong, with numbers. */
    detail: string;
    rect: { x: number; y: number; width: number; height: number };
    /** The reason a case accepted this finding, when it did. */
    allowed?: string;
}

/** A case's acceptance of one element for one check. Never a whole check (D2.8). */
export interface LayoutAllowance {
    check: LayoutCheckId;
    /** Matched against the finding's selector: equal, or a prefix followed by a space or `.`. */
    selector: string;
    /** Why the app is right and the check is not. */
    reason: string;
    /** Limits the acceptance to these sizes; absent means every size. */
    viewports?: readonly ViewportName[];
}

/** A case's way of narrowing or relaxing the matrix. */
export interface LayoutCaseOptions {
    /** Runs the matrix at these sizes only. */
    only?: { viewports: readonly ViewportName[]; reason: string };
    /** Accepts single elements for single checks. */
    allow?: readonly LayoutAllowance[];
}

/** The shortest reason that can say anything. */
const MIN_REASON_LENGTH = 20;

/** Words that mark a reason as a placeholder. */
const PLACEHOLDER_REASON = /^\s*(?:todo|fixme|temp)/i;

/** Where the opt-out contract is written down. */
const OPT_OUT_DOCS = 'docs/tools/layout-sweep.md#opting-out';

/**
 * Refuses a reason that is not one. An exemption should be an argument, not a shrug.
 *
 * @param reason - the text beside an `only` or an `allow`
 * @param where - what it belongs to, for the message
 * @throws {Error} when the reason is short or a placeholder
 */
export const assertReason = (reason: string, where: string): void => {
    if (reason.trim().length < MIN_REASON_LENGTH || PLACEHOLDER_REASON.test(reason))
        throw new Error(
            `${where}: the reason "${reason}" is not a reason (at least ${String(MIN_REASON_LENGTH)} characters, not a TODO). See ${OPT_OUT_DOCS}`
        );
};

/** Checks every reason in a case's options, so a bad one fails when the spec is collected. */
export const assertCaseOptions = (name: string, options: LayoutCaseOptions | undefined): void => {
    if (!options) return;
    if (options.only) assertReason(options.only.reason, `layout case "${name}" (only)`);
    for (const allowance of options.allow ?? [])
        assertReason(allowance.reason, `layout case "${name}" (allow ${allowance.check})`);
};

/** Whether `selector` is `pattern`, or sits inside it (`pattern` then a space, a dot or a bracket). */
const selectorMatches = (selector: string, pattern: string): boolean =>
    selector === pattern || ['.', ' ', '['].some((next) => selector.startsWith(pattern + next));

/**
 * Marks the findings a case accepted with the reason; the rest are returned untouched.
 *
 * An accepted finding stays in the list so it still reaches the report (D2.8).
 *
 * @param findings - what the collector found at one size
 * @param viewport - the size they were found at
 * @param allow - the case's allowances
 */
export const applyAllowances = (
    findings: readonly LayoutFinding[],
    viewport: ViewportName,
    allow: readonly LayoutAllowance[] = []
): LayoutFinding[] =>
    findings.map((finding) => {
        const match = allow.find(
            (allowance) =>
                allowance.check === finding.check &&
                selectorMatches(finding.selector, allowance.selector) &&
                (allowance.viewports?.includes(viewport) ?? true)
        );
        return match ? { ...finding, allowed: match.reason } : finding;
    });

/** The findings that fail the run: blocking, and not accepted. */
export const blockingFindings = (findings: readonly LayoutFinding[]): LayoutFinding[] =>
    findings.filter((finding) => finding.severity === 'blocking' && finding.allowed === undefined);

/** One line per finding: `check — selector — detail`. */
const findingLine = ({ check, mode, selector, detail }: LayoutFinding): string =>
    `  ${check}${mode === 'normal' ? '' : ` (${mode})`} — ${selector} — ${detail}`;

/**
 * The failure message for a size, shaped like the axe gate's.
 *
 * @param label - the case's name
 * @param viewport - the size the findings were found at
 * @param blocking - the findings that fail
 */
export const gateMessage = (
    label: string,
    viewport: ViewportName,
    blocking: readonly LayoutFinding[]
): string =>
    `[layout ${label} @ ${viewport}] ${String(blocking.length)} blocking finding(s):\n` +
    blocking.map((finding) => findingLine(finding)).join('\n');

/**
 * The sizes a case runs the matrix at: all of them, or the ones its `only` names, in matrix
 * order.
 *
 * @param order - the matrix sizes the sweep walks, in order
 * @param options - the case's options
 */
export const sizesFor = (
    order: readonly ViewportName[],
    options: LayoutCaseOptions | undefined
): ViewportName[] => {
    const only = options?.only?.viewports;
    return only ? order.filter((name) => only.includes(name)) : [...order];
};

/** The text spacing of WCAG 1.4.12, as Understanding 1.4.12 words it. */
export const TEXT_SPACING_CSS = `
* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-block-end: 2em !important; }
`;

/** Chrome's "200 %" font setting, approximated: rem and em scale, px does not. */
export const TEXT_200_CSS = 'html { font-size: 200% !important; }';

/** Which text mode a size is checked in, besides `normal`: the sweep's policy, in one place. */
export const TEXT_MODE_AT: Partial<Record<ViewportName, Exclude<LayoutMode, 'normal'>>> = {
    desktop: 'text-200',
    phone: 'text-spacing'
};

/** The text modes that fail the run; the others only report (Q2.4). */
export const BLOCKING_TEXT_MODES: readonly LayoutMode[] = ['normal', 'text-spacing'];
