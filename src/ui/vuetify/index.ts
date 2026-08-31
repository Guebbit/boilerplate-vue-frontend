/**
 * @module
 * ─────────────────────────────────────────────────────────────────────────────
 * THE theme file.
 *
 * This boilerplate's design tokens live here and ONLY here:
 * - Vuetify owns colors, typography, component defaults (this file).
 * - Tailwind owns layout/spacing utilities and ALIASES these colors
 *   (see src/styles/tailwind.css) — it defines no palette of its own.
 *
 * Downstream projects restyle the whole app by editing the palettes and
 * the `defaults` section below. Nothing else needs to change.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import type { ThemeDefinition } from 'vuetify';
import { en, it } from 'vuetify/locale';
import { lucideAliases, lucideIconSet } from './icons.ts';

/**
 * Light theme.
 * `on-*` colors are set explicitly to guarantee WCAG AA contrast:
 * the orange/cyan brand colors are too light for white text.
 */
const light: ThemeDefinition = {
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
};

/**
 * Dark theme.
 * Primary/secondary swap (cyan leads at night), mirroring the palette the
 * boilerplate always had.
 */
const dark: ThemeDefinition = {
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
};

/**
 * The app's Vuetify instance — theme, icon set and component `defaults` — installed by
 * `src/main.ts`.
 */
export default createVuetify({
    theme: {
        defaultTheme: 'system',
        themes: { light, dark },
        // generates primary-darken-1 … used by gradients and hover states
        variations: {
            colors: ['primary', 'secondary', 'tertiary'],
            lighten: 2,
            darken: 2
        }
    },

    icons: {
        defaultSet: 'lucide',
        aliases: lucideAliases,
        sets: { lucide: lucideIconSet }
    },

    // Vuetify's own strings (data-table, pagination, aria-labels…).
    // Kept in sync with vue-i18n by LayoutDefault watching the app locale.
    locale: {
        locale: 'en',
        fallback: 'en',
        messages: { en, it }
    },

    /**
     * The app-wide personality: every component picks these up unless a view
     * overrides them. This is where a fork changes "how the app feels".
     */
    defaults: {
        VBtn: { rounded: 'lg', class: 'text-none', variant: 'flat' },
        VCard: { rounded: 'xl' },
        VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
        VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary' },
        VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
        VCheckbox: { color: 'primary' },
        VSwitch: { color: 'primary', inset: true },
        VAlert: { rounded: 'lg', variant: 'tonal' },
        VChip: { rounded: 'pill' },
        VPagination: { rounded: 'circle', activeColor: 'primary' },
        VDataTable: { hover: true },
        VTooltip: { location: 'top' }
    }
});
