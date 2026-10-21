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
 * 6. No colour-bearing declaration is repeated across SFC `<style>` blocks: a value used twice
 *    becomes a class in `main.css`.
 * 7. The boot surfaces (`index.html`'s splash and meta tags, the manifest, `browserconfig.xml`)
 *    show only colours the theme has, and the address bar has a light and a dark colour.
 */
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import type { Declaration } from 'postcss';
import { createVuetify } from 'vuetify';
import { cssSources, insideTheme, MAIN_CSS, readRoot } from '../../scripts/css-sources';
import { isColorLiteral, themeColorNames, CSS_NAMED_COLORS } from '../../scripts/design-policy';
import { dark, light, variations } from '../../src/ui/vuetify/theme';

/** Every declaration and at-rule of every source, parsed. */
const parsed = cssSources().map(({ file, css }) => ({ file, root: postcss.parse(css) }));

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
        // Not vacuous: main.css and the remaining SFC style blocks.
        expect(parsed.length).toBeGreaterThanOrEqual(2);
        expect(declarations().length).toBeGreaterThan(20);
    });

    it('holds no colour literal in a declaration outside @theme', () => {
        const offenders = declarations()
            .filter(({ decl }) => !insideTheme(decl.parent) && holdsColorLiteral(decl))
            .map(({ file, decl }) => `${file}: ${decl.prop}: ${decl.value}`);
        expect(offenders).toEqual([]);
    });

    it('repeats no colour-bearing declaration across SFC style blocks', () => {
        const sfcDeclarations = declarations().filter(
            ({ file, decl }) => file !== MAIN_CSS && COLOR_PROPERTY.test(decl.prop)
        );
        // Not vacuous: the SFC blocks do hold colour-bearing declarations.
        expect(sfcDeclarations.length).toBeGreaterThanOrEqual(5);
        const places = new Map<string, Set<string>>();
        for (const { file, decl } of sfcDeclarations) {
            const key = `${decl.prop}: ${decl.value.replaceAll(/\s+/g, ' ')}`;
            places.set(key, (places.get(key) ?? new Set<string>()).add(file));
        }
        const offenders = [...places]
            .filter(([, files]) => files.size > 1)
            .map(
                ([key, files]) =>
                    `${key} — in ${[...files].join(', ')}: move it to a class in src/styles/main.css`
            );
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

/** Every colour value the theme declares, either theme, lower case. */
const themeValues = (): Set<string> =>
    new Set(
        [...Object.values(light.colors), ...Object.values(dark.colors)].map((value) =>
            value.toLowerCase()
        )
    );

/** Hex colours written in a boot file, lower case. */
const hexColorsIn = (text: string): string[] =>
    [...text.matchAll(/#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})(?![\w-])/gi)].map((match) =>
        match[0].toLowerCase()
    );

describe('design tokens, the boot surfaces', () => {
    const bootFiles = [
        'index.html',
        'public/favicon/site.webmanifest',
        'public/favicon/browserconfig.xml'
    ];

    it.each(bootFiles)('shows only theme colours in %s', (file) => {
        const values = themeValues();
        const found = hexColorsIn(readRoot(file));
        expect(found.length).toBeGreaterThan(0);
        expect(found.filter((color) => !values.has(color))).toEqual([]);
    });

    it("gives the address bar a light and a dark colour, each the theme's surface", () => {
        const html = readRoot('index.html');
        const colorFor = (scheme: string): string | undefined =>
            new RegExp(
                String.raw`<meta name="theme-color" media="\(prefers-color-scheme: ${scheme}\)" content="(#[\da-f]+)"`,
                'i'
            ).exec(html)?.[1];
        expect(colorFor('light')).toBe(light.colors.surface);
        expect(colorFor('dark')).toBe(dark.colors.surface);
    });

    it("paints the splash with the theme's background and text colours", () => {
        const html = readRoot('index.html');
        expect(html).toContain(`color: ${light.colors['on-background']};`);
        expect(html).toContain(`background: ${light.colors.background};`);
        expect(html).toContain(`color: ${dark.colors['on-background']};`);
        expect(html).toContain(`background: ${dark.colors.background};`);
    });
});

/** WCAG relative luminance of a `#rrggbb` colour. */
const luminance = (hex: string): number => {
    const [red, green, blue] = [1, 3, 5].map((at) => {
        const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
        return channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/** Composites `foreground` at `alpha` over `background`, per channel. */
const over = (foreground: string, background: string, alpha: number): string =>
    `#${[1, 3, 5]
        .map((at) =>
            Math.round(
                Number.parseInt(foreground.slice(at, at + 2), 16) * alpha +
                    Number.parseInt(background.slice(at, at + 2), 16) * (1 - alpha)
            )
                .toString(16)
                .padStart(2, '0')
        )
        .join('')}`;

/** WCAG contrast ratio of two `#rrggbb` colours. */
const contrast = (a: string, b: string): number => {
    const [high, low] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
};

describe('design tokens, secondary text', () => {
    const themes = [
        ['light', light],
        ['dark', dark]
    ] as const;
    const surfaces = ['surface', 'background', 'surface-variant'] as const;

    it.each(
        themes.flatMap(([name, theme]) =>
            surfaces.flatMap((surface) =>
                (['on-surface', 'error'] as const).map(
                    (ink) => [name, theme, surface, ink] as const
                )
            )
        )
    )('%s theme, %#: medium-emphasis text passes AA', (_name, theme, surface, ink) => {
        const alpha = theme.variables['medium-emphasis-opacity'];
        const background = theme.colors[surface];
        const text = over(theme.colors[ink], background, alpha);

        expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
    });
});
