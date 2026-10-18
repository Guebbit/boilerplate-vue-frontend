/**
 * @module
 * The layout matrix: the device sizes every browser suite lays the app out at.
 *
 * Pure data, no `cy`, no DOM — the Cypress support, `cypress.config.ts`, Vitest and the Node
 * report tools can all import it. Sizes live here and nowhere else.
 * Reasoning and the band each size stands for: `docs/tools/visual-regression.md`.
 */

/** One device size the suites lay the app out at. */
export interface Viewport {
    /** CSS pixels. */
    width: number;
    /** CSS pixels. */
    height: number;
    /** A device class with a coarse pointer: `applyViewport` switches touch emulation for it. */
    touch: boolean;
    /** Why this size exists, one line. */
    why: string;
}

/** The layout matrix: one entry per breakpoint band plus the two stress sizes. */
export const VIEWPORTS = {
    'phone-small': {
        width: 320,
        height: 568,
        touch: true,
        why: 'WCAG 1.4.10 reflow width; the smallest phone still in use'
    },
    phone: {
        width: 390,
        height: 844,
        touch: true,
        why: 'the common phone class; the width the data table stacks rows below'
    },
    'phone-landscape': {
        width: 844,
        height: 390,
        touch: true,
        why: 'a short height (sticky bar, dialogs); also stands in for 200 % zoom on a desktop'
    },
    tablet: {
        width: 1024,
        height: 768,
        touch: true,
        why: 'the band where the nav is collapsed but the grid is wide'
    },
    desktop: {
        width: 1280,
        height: 800,
        touch: false,
        why: 'the configured default; every desktop visual baseline is this size'
    }
} as const satisfies Record<string, Viewport>;

/** A name in {@link VIEWPORTS}. */
export type ViewportName = keyof typeof VIEWPORTS;

/** Sizes a report tool needs that the layout matrix does not sweep. */
export const REPORT_VIEWPORTS = {
    'lighthouse-mobile': {
        width: 412,
        height: 823,
        touch: true,
        why: "Lighthouse's mobile preset"
    }
} as const satisfies Record<string, Viewport>;
