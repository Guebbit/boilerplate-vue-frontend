/**
 * @module
 * What Lighthouse is told: the phone profile, the categories, and the switches that keep it quiet.
 *
 * Pure data, so a unit test can pin the profile to Lighthouse's own preset. Reasoning (D2, D4):
 * `docs/tools/lighthouse.md`.
 */
import type { CliFlags, Flags } from 'lighthouse';
import { REPORT_VIEWPORTS } from '../e2e/viewports';

/** Categories audited. Accessibility is off on purpose: same axe-core as the sweep, which covers more. */
export const CATEGORIES = ['performance', 'best-practices', 'seo'] as const;

/**
 * Audits skipped outright. `cache-insight` would grade the preview server's caching, not the
 * app's: nginx owns the cache headers (`docker/nginx.conf`).
 */
export const SKIPPED_AUDITS = ['cache-insight'] as const;

/**
 * The flags of one `lighthouse(url, flags, config, page)` call.
 *
 * Lighthouse's own mobile defaults give the throttling (`mobileSlow4G`, `simulate`) and the user
 * agent; only the screen size comes from `viewports.ts`.
 * https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md
 *
 * @param port - the DevTools port of the Chrome the runner launched
 */
export const lighthouseFlags = (port: number): Flags & Pick<CliFlags, 'enableErrorReporting'> => ({
    port,
    output: 'html',
    logLevel: 'error',
    // The Node API never asks Sentry anything; this makes that explicit.
    // https://github.com/GoogleChrome/lighthouse/blob/main/readme.md#sentry
    enableErrorReporting: false,
    formFactor: 'mobile',
    throttlingMethod: 'simulate',
    screenEmulation: {
        mobile: true,
        width: REPORT_VIEWPORTS['lighthouse-mobile'].width,
        height: REPORT_VIEWPORTS['lighthouse-mobile'].height,
        // Lighthouse's own Moto G Power ratio: image-size-responsive is calibrated to it.
        deviceScaleFactor: 1.75,
        disabled: false
    },
    onlyCategories: [...CATEGORIES],
    skipAudits: [...SKIPPED_AUDITS]
});
