/**
 * @module
 * Where the layout changes: the breakpoint thresholds and the width under which Vuetify calls
 * a screen "mobile". The one home for display config.
 *
 * The thresholds mirror Tailwind's (`src/styles/main.css`), so `useDisplay()`, `VRow`/`VCol` and
 * `sm:`/`md:`/`lg:` agree. The layout matrix (`scripts/e2e/viewports.ts`) puts one viewport in
 * each band. Why those sizes: `docs/theory/design-system.md`.
 */

/**
 * The lower edge of each band, in CSS px. Vuetify's own defaults do not line up with
 * Tailwind's, so they are set here.
 */
export const BREAKPOINTS = {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
} as const;

/**
 * Vuetify's `useDisplay().mobile` is true below this band's edge: a phone, not a laptop.
 * Its default is `lg`, which would put 1024 px tablets and small laptops on the phone layout
 * (fullscreen dialogs, touch-sized row buttons).
 * https://vuetifyjs.com/en/features/display-and-platform/
 */
export const MOBILE_BREAKPOINT = 'sm';

/** The `display` block handed to `createVuetify`. */
export const display = {
    mobileBreakpoint: MOBILE_BREAKPOINT,
    thresholds: BREAKPOINTS
} as const;
