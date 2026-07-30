import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import type { ThemeDefinition } from 'vuetify';
import { en, it } from 'vuetify/locale';
import { lucideAliases, lucideIconSet } from './icons.ts';

/**
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

/**
 * Light theme.
 * `on-*` colors are set explicitly to guarantee WCAG AA contrast:
 * the orange/cyan brand colors are too light for white text.
 */
/* eslint-disable @typescript-eslint/naming-convention -- Vuetify's theme API uses kebab-case color keys */
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
        error: '#c62828',
        success: '#2e7d32',
        warning: '#b26a00',
        info: '#0277bd'
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
        error: '#ef5350',
        success: '#66bb6a',
        warning: '#ffb74d',
        info: '#4fc3f7'
    }
};
/* eslint-enable @typescript-eslint/naming-convention */

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
