/**
 * @module
 * The Lighthouse cases and exceptions that belong to no module: the shell's landing page, and what
 * every case accepts. See `docs/tools/lighthouse.md#cases-live-with-modules`.
 */
import type { LighthouseCase } from '../support/lighthouse/case';

/** The landing page: hero, consent banner. Public and crawlable. */
export const siteCases: readonly LighthouseCase[] = [
    { name: 'shell/home', route: '/en', seo: true }
];

/**
 * Audits every case accepts, audit id → why. A stale one fails the run, so each goes when its
 * cause does.
 */
export const SITE_EXCEPTIONS: Readonly<Record<string, string>> = {
    'robots-txt':
        'no robots.txt is written until the sitemap lane lands 42-generate-robots-txt.sh; /robots.txt is the SPA fallback until then'
};
