/**
 * Invasive CSS, held by a ratchet: CSS that reaches into Vuetify, over-specific selectors, raw
 * z-indexes, magic lengths, redefined utilities, utilities that duplicate a Vuetify prop, native
 * `title` tooltips and scripts that query Vuetify's DOM. Every check lives in
 * `scripts/audit/css-invasive/scan.ts`; `npm run audit:css` prints the same hits for a human.
 *
 * Today's hits are frozen in `css-invasiveness.baseline.json`, keyed by file + check + anchor,
 * never by line. The baseline only shrinks.
 *
 * ── What each case guards ──────────────────────────────────────────────────────────────────
 * 1. The scan reads the app at all: every CSS source, every template, the shipped scripts.
 * 2. Per check: no hit the baseline does not list (new invasive CSS is refused), and no baseline
 *    entry that no longer occurs (a fixed hit is struck off with `--shrink-baseline`).
 * 3. The baseline is tidy: sorted, unique keys, known checks, positive counts.
 * 4. Each check fires on a minimal sample, so a check that silently stopped matching fails here
 *    rather than passing the ratchet by finding nothing.
 * 5. The `css-allow <check> -- <why>` grammar: it covers one node for one check; one with no
 *    reason, an unknown check, nothing to cover, or two Vuetify parts is a finding of its own.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
    cssSources,
    documentCssSources,
    vueFiles,
    type CssSource
} from '../../scripts/css-sources';
import {
    applyAllowances,
    CHECKS,
    scanApp,
    scanCss,
    scanScript,
    scanTemplate,
    templateContext,
    type CheckId,
    type CssFinding
} from '../../scripts/audit/css-invasive/scan';
import {
    compareToBaseline,
    keyOf,
    readBaseline,
    type BaselineEntry
} from '../../scripts/audit/css-invasive/ratchet';

/** Every check id. */
const CHECK_IDS = Object.keys(CHECKS) as CheckId[];

/** A synthetic CSS source for the sample cases. */
const sample = (css: string, scoped = true): CssSource => ({
    file: 'Sample.vue',
    css,
    firstLine: 1,
    scoped,
    sfc: true
});

/** The checks that fire on a CSS sample, allowances applied. */
const cssChecks = async (css: string, scoped = true): Promise<CheckId[]> =>
    applyAllowances(await scanCss([sample(css, scoped)])).map((finding) => finding.check);

/** The checks that fire on an SFC template sample, allowances applied. */
const templateChecks = (template: string): CheckId[] =>
    applyAllowances(
        scanTemplate('Sample.vue', `<template>${template}</template>`, templateContext())
    ).map((finding) => finding.check);

/** The checks that fire on a whole SFC source (template and style blocks together). */
const sfcChecks = (source: string): CheckId[] =>
    applyAllowances(scanTemplate('Sample.vue', source, templateContext())).map(
        (finding) => finding.check
    );

/** A ratchet list, one key per line, for a failure message. */
const listed = (entries: BaselineEntry[]): string =>
    entries.map((entry) => `×${String(entry.count)} ${keyOf(entry)}`).join('\n');

describe('invasive CSS, against the baseline', () => {
    /** The scan of the app. */
    let findings: CssFinding[] = [];

    /** The frozen known hits. */
    const baseline = readBaseline();

    beforeAll(async () => {
        findings = await scanApp();
    });

    it('reads the CSS, the templates and the scripts', () => {
        // Not vacuous: main.css, the splash and the remaining SFC style blocks; over a hundred SFCs.
        expect(cssSources().length + documentCssSources().length).toBeGreaterThanOrEqual(3);
        expect(vueFiles().length).toBeGreaterThan(100);
        expect(documentCssSources().length).toBeGreaterThanOrEqual(1);
    });

    it.each(CHECK_IDS)('has no new `%s` hit, and no fixed one left in the baseline', (check) => {
        const { added, gone } = compareToBaseline(
            findings.filter((finding) => finding.check === check),
            baseline.filter((entry) => entry.check === check)
        );
        expect(
            listed(added),
            `new hits: fix them (\`npm run audit:css\` names the fix), or allow one with /* css-allow ${check} -- <why> */`
        ).toBe('');
        expect(listed(gone), 'fixed hits: run `npm run audit:css -- --shrink-baseline`').toBe('');
    });

    it('keeps a tidy baseline: sorted, unique, known checks, positive counts', () => {
        const keys = baseline.map((entry) => keyOf(entry));
        expect(keys).toEqual(keys.toSorted((a, b) => a.localeCompare(b)));
        expect(new Set(keys).size).toBe(keys.length);
        expect(baseline.filter((entry) => !CHECK_IDS.includes(entry.check))).toEqual([]);
        expect(baseline.filter((entry) => entry.count < 1)).toEqual([]);
    });
});

describe('each CSS check fires on a sample', () => {
    it.each<[CheckId, string, boolean?]>([
        ['vuetify-internal', '.card .v-field { color: inherit; }'],
        ['deep', '.board :deep(.cell) { color: inherit; }'],
        ['vuetify-internal', '.board :deep(td:first-child) { color: inherit; }'],
        ['vuetify-variable', '.row { --v-medium-emphasis-opacity: 1; }'],
        ['important', '.row { color: inherit !important; }'],
        ['max-specificity', '.a .b .c { color: inherit; }'],
        ['max-specificity', '#splash { color: inherit; }'],
        ['max-compound', '.a > .b :deep(.c .d) { color: inherit; }'],
        ['scoped-type-selector', '.list li { color: inherit; }'],
        ['z-index', '.layer { z-index: 100; }'],
        ['magic-length', '.box { padding: 13px; }'],
        ['magic-length', '.box { margin-top: 0.3rem; }'],
        ['utility-redefinition', '.panel .opacity-70 { opacity: 0.82; }'],
        ['duplicate-in-rule', '.box { color: inherit; color: currentcolor; }'],
        ['unit-disallowed-list', '.splash { min-height: 100vh; }']
    ])('%s: %s', async (check, css) => {
        expect(await cssChecks(css)).toContain(check);
    });

    it('lets clean CSS through', async () => {
        const css = `
            .board { position: sticky; z-index: 1; padding: var(--gap, 13px); }
            .board:focus-visible { margin: 0.5rem; z-index: var(--z-index-toast); }
            .list li { color: inherit; }
            .splash { min-height: 100dvh; }
        `;
        // An unscoped block may style an element: `li` is no scoped-CSS slowdown there.
        expect(await cssChecks(css, false)).toEqual([]);
    });

    it('fires block-size on an SFC block over the limit', async () => {
        const css = `.big { ${Array.from({ length: 16 }, (_, index) => `--d${String(index)}: 0;`).join(' ')} }`;
        expect(await cssChecks(css)).toContain('block-size');
    });

    it('fires repeated-custom-property on a declaration two SFCs share', async () => {
        const scan = await scanCss([
            { ...sample('.a { --tint: 1; }'), file: 'A.vue' },
            { ...sample('.b { --tint: 1; }'), file: 'B.vue' }
        ]);
        expect(
            applyAllowances(scan).filter((hit) => hit.check === 'repeated-custom-property')
        ).toHaveLength(2);
    });
});

describe('each template and script check fires on a sample', () => {
    it.each<[CheckId, string]>([
        ['vuetify-prop-first', '<v-alert class="rounded-none" />'],
        ['vuetify-prop-first', '<v-btn class="min-h-11 sm:min-h-0" />'],
        ['vuetify-prop-first', '<v-btn class="bg-primary" />'],
        ['tailwind-important', '<div class="!mt-2" />'],
        ['vuetify-arbitrary-variant', '<div class="[&_.v-field]:bg-surface" />'],
        ['vuetify-variable', '<v-text-field class="[--v-disabled-opacity:0.8]" />'],
        ['native-title', '<span :title="hint">x</span>'],
        ['native-title', '<v-btn title="Export" />']
    ])('%s: %s', (check, template) => {
        expect(templateChecks(template)).toContain(check);
    });

    it('lets a title prop, a layout class and a non-theme class through', () => {
        // `v-card` renders `title` visibly; `w-full` on a card is layout; `bg-gradient` is no colour.
        expect(templateChecks('<v-card title="Orders" class="w-full bg-gradient" />')).toEqual([]);
    });

    it('fires vuetify-root-override on a scoped rule that restyles a Vuetify tag by its class', () => {
        const override =
            '<template><v-list-item-subtitle class="when" /></template><style scoped>.when { white-space: normal }</style>';
        const feedsOurCss =
            '<template><v-list-item-subtitle class="when" /></template><style scoped>.when { --x: 1 }</style>';

        expect(sfcChecks(override)).toEqual(['vuetify-root-override']);
        expect(sfcChecks(feedsOurCss)).toEqual([]);
    });

    it('fires vuetify-dom-query on a Vuetify class in a DOM query', () => {
        const text = "const input = el.closest('.v-field')?.querySelector('input');";
        expect(applyAllowances(scanScript('a.ts', text)).map((hit) => hit.check)).toEqual([
            'vuetify-dom-query'
        ]);
    });
});

describe('the css-allow grammar', () => {
    it('covers the next rule for the named check only', async () => {
        const css =
            '/* css-allow vuetify-internal -- no prop reaches it */\n.a .v-field { z-index: 50; }';
        expect(await cssChecks(css)).toEqual(['z-index']);
    });

    it('covers the next element in a template, and the next line in a script', () => {
        expect(
            templateChecks('<!-- css-allow native-title -- repeats the name --><span title="x" />')
        ).toEqual([]);
        const text = "// css-allow vuetify-dom-query -- no other hook\nel.closest('.v-field');";
        expect(applyAllowances(scanScript('a.ts', text))).toEqual([]);
    });

    it.each<[string, string, CheckId]>([
        ['no reason', '/* css-allow deep */\n.a :deep(.b) {}', 'bad-allowance'],
        ['an unknown check', '/* css-allow everything -- why */\n.a {}', 'bad-allowance'],
        [
            'nothing to cover',
            '/* css-allow deep -- why */\n.a { color: inherit; }',
            'stale-allowance'
        ],
        [
            'two Vuetify parts',
            '/* css-allow vuetify-internal -- why */\n.v-label, .v-messages { color: inherit; }',
            'bad-allowance'
        ]
    ])('refuses an allowance with %s', async (_label, css, check) => {
        expect(await cssChecks(css)).toContain(check);
    });
});
