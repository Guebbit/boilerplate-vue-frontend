/**
 * Invasive CSS, held by a gate: CSS that reaches into Vuetify, raw z-indexes, redefined
 * utilities, native `title` tooltips and scripts that query Vuetify's DOM. Every check lives in
 * `scripts/audit/css-invasive/scan.ts`; `npm run audit:css` prints the same hits for a human.
 *
 * The gate is pure: the app has no hit, and a new one fails here. `css-allow <check> -- <why>` is
 * the only way out.
 *
 * ── What each case guards ──────────────────────────────────────────────────────────────────
 * 1. The scan reads the app at all: every CSS source, every template, the shipped scripts.
 * 2. Per check: the app has no hit (new invasive CSS is refused).
 * 3. Each check fires on a minimal sample, so a check that silently stopped matching fails here
 *    rather than passing the ratchet by finding nothing.
 * 4. The `css-allow <check> -- <why>` grammar: it covers one node for one check; one with no
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

/** The checks that fire on a script source. */
const scripts = (text: string): CheckId[] =>
    applyAllowances(scanScript('a.ts', text)).map((hit) => hit.check);

/** The checks that fire on a whole SFC source (template and style blocks together). */
const sfcChecks = (source: string): CheckId[] =>
    applyAllowances(scanTemplate('Sample.vue', source, templateContext())).map(
        (finding) => finding.check
    );

describe('invasive CSS, as a gate', () => {
    /** The scan of the app. */
    let findings: CssFinding[] = [];

    beforeAll(async () => {
        findings = await scanApp();
    });

    it('reads the CSS, the templates and the scripts', () => {
        // Not vacuous: main.css, the splash and the remaining SFC style blocks; over a hundred SFCs.
        expect(cssSources().length + documentCssSources().length).toBeGreaterThanOrEqual(3);
        expect(vueFiles().length).toBeGreaterThan(100);
        expect(documentCssSources().length).toBeGreaterThanOrEqual(1);
    });

    it.each(CHECK_IDS)('has no `%s` hit', (check) => {
        const hits = findings
            .filter((finding) => finding.check === check)
            .map((finding) => `${finding.file}:${String(finding.line)} ${finding.anchor}`);
        expect(
            hits,
            `fix them (\`npm run audit:css\` names the fix), or allow one with /* css-allow ${check} -- <why> */`
        ).toEqual([]);
    });
});

describe('each CSS check fires on a sample', () => {
    it.each<[CheckId, string, boolean?]>([
        ['vuetify-internal', '.card .v-field { color: inherit; }'],
        ['deep', '.board :deep(.cell) { color: inherit; }'],
        ['vuetify-internal', '.board :deep(td:first-child) { color: inherit; }'],
        ['vuetify-unknown-class', '.a .v-data-table-headers--loading { opacity: 1; }'],
        ['vuetify-variable', '.row { --v-medium-emphasis-opacity: 1; }'],
        ['z-index', '.layer { z-index: 100; }'],
        ['utility-redefinition', '.panel .opacity-70 { opacity: 0.82; }'],
        ['unit-disallowed-list', '.splash { min-height: 100vh; }']
    ])('%s: %s', async (check, css) => {
        expect(await cssChecks(css)).toContain(check);
    });

    it('lets clean CSS through', async () => {
        const css = `
            .board { position: sticky; z-index: 1; padding: var(--gap, 13px); }
            .board:focus-visible { margin: 0.5rem; z-index: var(--z-index-toast); }
            .splash { min-height: 100dvh; }
        `;
        expect(await cssChecks(css)).toEqual([]);
    });
});

describe('each template and script check fires on a sample', () => {
    it.each<[CheckId, string]>([
        ['vuetify-arbitrary-variant', '<div class="[&_.v-field]:bg-surface" />'],
        ['touch-size-utility', '<v-chip class="min-h-11 sm:min-h-0" />'],
        ['vuetify-variable', '<v-text-field class="[--v-disabled-opacity:0.8]" />'],
        ['vuetify-variable', "<v-text-field :class=\"ok ? '[--v-disabled-opacity:0.8]' : ''\" />"],
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

    it('fires vuetify-dom-query on any string naming a Vuetify class, and not on a comment', () => {
        expect(scripts("const S = '.v-table__wrapper';")).toEqual(['vuetify-dom-query']);
        expect(scripts('/* the .v-field wrapper */ const a = 1;')).toEqual([]);
    });

    it('fires vuetify-unknown-class on a script literal for a class Vuetify does not ship', () => {
        const text = "const S = '.v-data-table-headers--loading';";
        expect(applyAllowances(scanScript('a.ts', text)).map((hit) => hit.check)).toContain(
            'vuetify-unknown-class'
        );
    });

    it('does not fire vuetify-unknown-class on a class Vuetify ships', async () => {
        expect(await cssChecks('.a .v-field { color: inherit; }')).not.toContain(
            'vuetify-unknown-class'
        );
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
