/**
 * @module
 * ─────────────────────────────────────────────────────────────────────────────
 * The theme as DATA: the light and dark colour maps and the generated variations.
 *
 * Why a file of its own: `index.ts` builds the Vuetify instance (it imports `vuetify/styles`,
 * the icon set and a storage read), which a lint rule or a spec cannot load. This file imports a
 * type and nothing else, so `scripts/design-policy.ts`, `local/theme-token` and
 * `tests/cross-cutting/design-tokens.spec.ts` read the same colours the app runs on.
 *
 * Who owns what, and why Tailwind only aliases these colours: `docs/theory/design-system.md`.
 * Breakpoint thresholds are not here: they live with the display config.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { ThemeDefinition } from 'vuetify';

/**
 * Light theme.
 * `on-*` colors are set explicitly to guarantee WCAG AA contrast:
 * the orange/cyan brand colors are too light for white text.
 */
export const light = {
    dark: false,
    colors: {
        primary: '#ff9800',
        'on-primary': '#261500',
        secondary: '#00bcd4',
        'on-secondary': '#00252b',
        tertiary: '#7c4dff',
        'on-tertiary': '#ffffff',
        background: '#f6f7fb',
        'on-background': '#1d2433',
        surface: '#ffffff',
        'on-surface': '#1d2433',
        'surface-variant': '#eef1f8',
        'on-surface-variant': '#43506b',
        // #c62828 measured 4.4:1 on the page background (#f6f7fb) under a field's messages;
        // this is 5.6:1 there and keeps white `on-error` at 8.6:1.
        error: '#b71c1c',
        /*
         * Status colours, dark enough to read as TEXT on their own tonal wash.
         *
         * `VAlert` defaults to `variant="tonal"`, which draws the colour at 12% opacity as the
         * background and at full strength as the text — so the token has to pass 4.5:1 against
         * itself-on-white, not against white. The previous #2e7d32 / #b26a00 / #0277bd measured
         * about 4.3:1, 3.9:1 and 4.1:1 on their washes; these measure 5.9:1, 5.6:1 and 6.5:1.
         * Solid uses (`color="warning"` on a button or system bar) still get a white `on-*`,
         * which Vuetify derives automatically and which only improves as the base darkens.
         */
        success: '#1b5e20',
        warning: '#8a5200',
        info: '#01579b',
        /*
         * Keyboard focus ring. Dark rather than brand orange: #ff9800 measures about 2:1 on
         * white, and a focus ring has to reach 3:1 against whatever it is drawn over (WCAG
         * 2.4.11). The same near-black as `on-surface`, with a surface-coloured halo in
         * main.css so it still separates from a dark button.
         */
        focus: '#1d2433',
        /*
         * Link text needs its OWN colour, and cannot reuse `primary`.
         *
         * `primary` is chosen to be a strong background with dark text on top of it — which is
         * why `on-primary` exists. Used the other way round, as coloured text on a white surface,
         * #ff9800 measures about 2:1 against 4.5:1 required, so every inline link in the app was
         * a serious accessibility violation. This is the same orange darkened until it passes.
         */
        link: '#a35a00'
    }
} as const satisfies ThemeDefinition;

/**
 * Dark theme.
 * Primary/secondary swap (cyan leads at night), mirroring the palette the
 * boilerplate always had.
 */
export const dark = {
    dark: true,
    colors: {
        primary: '#26c6da',
        'on-primary': '#00252b',
        secondary: '#ffa726',
        'on-secondary': '#261500',
        tertiary: '#b39dff',
        'on-tertiary': '#1c1145',
        background: '#0e1116',
        'on-background': '#e7eaf1',
        surface: '#171b23',
        'on-surface': '#e7eaf1',
        'surface-variant': '#232936',
        'on-surface-variant': '#aab4c8',
        // Lighter than the #ef5350 it replaces: on its own 12% tonal wash over the dark
        // surface that measured about 4.0:1, this 5.9:1. The other three already pass.
        error: '#ff8a80',
        success: '#66bb6a',
        warning: '#ffb74d',
        info: '#4fc3f7',
        // The cyan that was the focus ring before it became a token; 9:1 on the dark surface.
        focus: '#26c6da',
        // Light enough to pass AA against the dark surface — see the light theme for why.
        link: '#ffb74d'
    }
} as const satisfies { dark: boolean; colors: Record<keyof typeof light.colors, string> };

/**
 * Which colours get generated `-lighten-N` / `-darken-N` variants, and how many of each.
 * `primary-darken-1` and friends exist only through this block.
 */
export const variations = {
    colors: ['primary', 'secondary', 'tertiary'],
    lighten: 2,
    darken: 2
};

/**
 * The colours of the families {@link variations} generates variants for, as literals.
 * `ThemeColor` derives the variant names from this; `variations.colors` is the same list typed
 * for Vuetify, which wants a mutable `string[]`.
 */
export const VARIATION_FAMILIES = ['primary', 'secondary', 'tertiary'] as const;

/**
 * The colours Vuetify defines in every theme whether or not the theme declares them.
 * A theme that omits `surface-bright` still has it, so a template may name it.
 */
export const VUETIFY_DEFAULT_COLORS = [
    'background',
    'surface',
    'surface-bright',
    'surface-light',
    'surface-variant',
    'primary',
    'secondary',
    'error',
    'info',
    'success',
    'warning'
] as const;
