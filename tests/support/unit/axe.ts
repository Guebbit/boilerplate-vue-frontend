/**
 * One axe-core audit for the unit specs: what is wrong with the rendered DOM, as readable lines.
 *
 * Every unit a11y spec goes through here, so the jsdom options live in one place:
 * jsdom computes no layout, so two rules can only give a false answer.
 */
import axe, { type RunOptions } from 'axe-core';

/**
 * What jsdom cannot judge, switched off; plus one AAA rule switched on.
 * `color-contrast` needs computed styles and layout. `region` wants a whole page, not a mounted part.
 * `identical-links-same-purpose` (WCAG 2.4.9, AAA) is outside axe's default tags, so it is named here
 * and in the Cypress rule set: same link text, same destination.
 */
const JSDOM_OPTIONS: RunOptions = {
    rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
        'identical-links-same-purpose': { enabled: true }
    }
};

/**
 * Audits a DOM subtree with axe-core and returns one line per violation: `<rule id>: <first node html>`.
 * Empty means clean, so a spec asserts `toEqual([])` and a failure prints what to look at.
 *
 * @param root - the subtree to audit; the whole body by default
 * @param options - axe's run options, replacing the jsdom defaults (for a spec that scopes to named rules)
 * @returns the violations, as readable lines
 */
export const axeViolations = (
    root: Element = document.body,
    options: RunOptions = JSDOM_OPTIONS
): Promise<string[]> =>
    // axe.run(context, options): audits `root`; resolves with `{ violations, passes, ... }`.
    // https://github.com/dequelabs/axe-core/blob/master/doc/API.md#api-name-axerun
    axe
        .run(root, options)
        .then(({ violations }) => violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`));
