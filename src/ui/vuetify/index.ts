/**
 * @module
 * ─────────────────────────────────────────────────────────────────────────────
 * The Vuetify instance: theme wiring, icon set, locale and component `defaults`.
 *
 * This boilerplate's design tokens are owned in two places:
 * - Vuetify owns colour, typography and component defaults. The colours themselves are data in
 *   `./theme.ts`; the personality (`defaults`) is below.
 * - Tailwind owns spacing, type size, z-index and layout, and ALIASES the Vuetify colours
 *   (see src/styles/main.css) — it defines no palette of its own.
 *
 * Who owns which token, and why: docs/theory/design-system.md.
 * Downstream projects restyle the app by editing `./theme.ts` and `defaults` below.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { en, it } from 'vuetify/locale';
import { lucideAliases, lucideIconSet } from './icons.ts';
import { display } from './breakpoints.ts';
import { dark, light, variations } from './theme.ts';
import { readThemePreference } from '@/infrastructure/theme-preference.ts';

/**
 * The app's Vuetify instance — theme, icon set and component `defaults` — installed by
 * `src/main.ts`.
 */
export default createVuetify({
    // Thresholds mirror Tailwind's: src/ui/vuetify/breakpoints.ts.
    display,

    theme: {
        // A visitor who has explicitly toggled the theme before gets that choice back on the
        // next visit; nobody who hasn't stays on Vuetify's own 'system' — the OS preference.
        defaultTheme: readThemePreference() ?? 'system',
        themes: { light, dark },
        // generates primary-darken-1 … used by gradients and hover states
        variations
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
