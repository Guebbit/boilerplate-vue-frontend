/**
 * The stylesheet half of the design lint: the colours the CSS uses are the colours the theme
 * defines, and the names the lint derives are the names Vuetify generates.
 *
 * `local/theme-token` covers scripts and templates at the AST. This covers what lint cannot read:
 * `src/styles/main.css` and every `<style>` block, parsed with PostCSS, and Vuetify itself.
 *
 * ── What each case guards ──────────────────────────────────────────────────────────────────
 * 1. No colour literal in a CSS declaration outside `@theme` (the theme file is the one home).
 * 2. Every `var(--v-theme-X)` names a colour the theme defines.
 * 3. Every Tailwind colour alias (`@theme inline`) points at such a colour, and both themes
 *    declare the same colours.
 * 4. Every width media query uses a breakpoint `main.css` declares.
 * 5. The names `scripts/design-policy.ts` derives equal the names Vuetify computes, so a Vuetify
 *    upgrade that adds or renames a generated colour fails here, not as a false lint finding.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import type { AtRule, Declaration, Node } from 'postcss';
import { createVuetify } from 'vuetify';
import { isColorLiteral, themeColorNames, CSS_NAMED_COLORS } from '../../scripts/design-policy';
import { dark, light, variations } from '../../src/ui/vuetify/theme';

/** The repo root (tests run from it). */
const ROOT = process.cwd();

/** The Tailwind entry stylesheet, the one global stylesheet of the app. */
const MAIN_CSS = path.resolve(ROOT, 'src/styles/main.css');

/** One piece of CSS and where it came from, for the failure message. */
interface CssSource {
    file: string;
    css: string;
}

/** Every `.vue` file under `src/`, tests excluded. */
const vueFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === 'tests' ? [] : vueFiles(full);
        return entry.name.endsWith('.vue') ? [full] : [];
    });

/** The stylesheet and the body of every SFC `<style>` block, each tagged with its file. */
const cssSources = (): CssSource[] => {
    const blocks = vueFiles(path.resolve(ROOT, 'src')).flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(/<style[^>]*>([\S\s]*?)<\/style>/g)].map(
            (match) => ({ file: path.relative(ROOT, file), css: match[1] ?? '' })
        )
    );
    return [
        { file: path.relative(ROOT, MAIN_CSS), css: readFileSync(MAIN_CSS, 'utf8') },
        ...blocks
    ];
};

/** Every declaration and at-rule of every source, parsed. */
const parsed = cssSources().map(({ file, css }) => ({ file, root: postcss.parse(css) }));

/** Whether a node sits inside an `@theme` block (plain or `inline`). */
const insideTheme = (node: Node | undefined): boolean => {
    if (node === undefined) return false;
    // `type === 'atrule'` is what makes the node an AtRule; PostCSS types `parent` more widely.
    if (node.type === 'atrule' && (node as AtRule).name === 'theme') return true;
    return insideTheme(node.parent);
};

/** Every declaration, with its file. */
const declarations = (): { file: string; decl: Declaration }[] =>
    parsed.flatMap(({ file, root }) => {
        const found: { file: string; decl: Declaration }[] = [];
        root.walkDecls((decl) => {
            found.push({ file, decl });
        });
        return found;
    });

/** Properties whose bare words can be colour names (`border: 1px solid red`). */
const COLOR_PROPERTY = /color|background|border|outline|fill|stroke|shadow|caret|accent/i;

/** Whether a declaration value holds a colour literal. */
const holdsColorLiteral = ({ prop, value }: Declaration): boolean => {
    if (isColorLiteral(value)) return true;
    if (!COLOR_PROPERTY.test(prop)) return false;
    return value
        .split(/[^a-z]+/i)
        .some((word) => isColorLiteral(word) && CSS_NAMED_COLORS.has(word.toLowerCase()));
};

describe('design tokens, the stylesheet half', () => {
    it('reads some CSS at all', () => {
        // Not vacuous: main.css and the six SFC style blocks.
        expect(parsed.length).toBeGreaterThanOrEqual(7);
        expect(declarations().length).toBeGreaterThan(20);
    });

    it('holds no colour literal in a declaration outside @theme', () => {
        const offenders = declarations()
            .filter(({ decl }) => !insideTheme(decl.parent) && holdsColorLiteral(decl))
            .map(({ file, decl }) => `${file}: ${decl.prop}: ${decl.value}`);
        expect(offenders).toEqual([]);
    });

    it('names only colours the theme defines in var(--v-theme-X)', () => {
        const names = themeColorNames();
        const offenders = declarations().flatMap(({ file, decl }) =>
            [...decl.value.matchAll(/var\(--v-theme-([\da-z-]+)/g)]
                .map((match) => match[1] ?? '')
                .filter((name) => !names.has(name))
                .map((name) => `${file}: ${decl.prop} uses --v-theme-${name}`)
        );
        expect(offenders).toEqual([]);
    });

    it('declares the same colours in the light and the dark theme', () => {
        expect(Object.keys(dark.colors).toSorted()).toEqual(Object.keys(light.colors).toSorted());
    });

    it('aliases, in @theme inline, only colours the theme defines', () => {
        const names = themeColorNames();
        const aliases = declarations().filter(
            ({ decl }) =>
                insideTheme(decl.parent) &&
                decl.prop.startsWith('--color-') &&
                decl.value.includes('--v-theme-')
        );
        expect(aliases.length).toBeGreaterThan(10);
        const offenders = aliases.flatMap(({ decl }) =>
            [...decl.value.matchAll(/--v-theme-([\da-z-]+)/g)]
                .map((match) => match[1] ?? '')
                .filter((name) => !names.has(name))
                .map((name) => `${decl.prop} -> --v-theme-${name}`)
        );
        expect(offenders).toEqual([]);
    });

    it('uses only declared breakpoints in a width media query', () => {
        const root = parsed[0]?.root;
        const declared = new Set<number>();
        root?.walkDecls(/^--breakpoint-/, (decl) => {
            declared.add(Number.parseFloat(decl.value));
        });
        expect(declared.size).toBeGreaterThanOrEqual(4);

        const offenders: string[] = [];
        for (const { file, root: tree } of parsed)
            tree.walkAtRules('media', (rule) => {
                for (const match of rule.params.matchAll(/(?:min|max)-width:\s*([\d.]+)px/g)) {
                    const px = Number.parseFloat(match[1] ?? '');
                    // A `max-width` query sits just under its breakpoint (599.98 for 600).
                    if (!declared.has(px) && !declared.has(Math.round(px)))
                        offenders.push(`${file}: @media ${rule.params}`);
                }
            });
        expect(offenders).toEqual([]);
    });

    it('derives the colour names Vuetify generates, in both themes', () => {
        const vuetify = createVuetify({
            theme: { themes: { light, dark }, variations, defaultTheme: 'light' }
        });
        const computed = vuetify.theme.computedThemes.value;
        const expected = [...themeColorNames()].toSorted();
        expect(Object.keys(computed.light?.colors ?? {}).toSorted()).toEqual(expected);
        expect(Object.keys(computed.dark?.colors ?? {}).toSorted()).toEqual(expected);
    });

    it('generates the two lighten and two darken steps `ThemeColor` spells out', () => {
        // `src/ui/types.ts` writes the levels as `1 | 2`; a third step added to `variations`
        // must be added there too.
        expect([variations.lighten, variations.darken]).toEqual([2, 2]);
    });
});
