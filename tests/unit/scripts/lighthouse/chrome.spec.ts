/**
 * `scripts/lighthouse/chrome.ts` and `settings.ts`: the egress lock, the sandbox flags, and the
 * phone profile pinned to Lighthouse's own preset.
 */
import { describe, it, expect } from 'vitest';
import { chromeFlags } from '../../../../scripts/lighthouse/chrome';
import { lighthouseFlags } from '../../../../scripts/lighthouse/settings';
// Lighthouse's own preset: the profile its simulated throttling is calibrated to.
import { screenEmulationMetrics } from '../../../../node_modules/lighthouse/core/config/constants.js';

describe('chromeFlags', () => {
    it.each([{ root: true }, { root: false }])('always locks egress (%o)', (options) => {
        const flags = chromeFlags(options);

        expect(flags).toContain('--proxy-server=127.0.0.1:9');
        expect(flags).toContain(
            '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'
        );
    });

    it('drops the sandbox only for root', () => {
        expect(chromeFlags({ root: true })).toContain('--no-sandbox');
        expect(chromeFlags({ root: false })).not.toContain('--no-sandbox');
    });
});

describe('lighthouseFlags', () => {
    it('never asks Lighthouse to report errors', () => {
        expect(lighthouseFlags(9222).enableErrorReporting).toBe(false);
    });

    it('audits the performance, best-practices and SEO categories, and skips cache-insight', () => {
        const flags = lighthouseFlags(9222);

        expect(flags.onlyCategories).toEqual(['performance', 'best-practices', 'seo']);
        expect(flags.skipAudits).toEqual(['cache-insight']);
    });

    it("keeps viewports.ts's phone profile equal to Lighthouse's own mobile preset", () => {
        expect(lighthouseFlags(9222).screenEmulation).toEqual(screenEmulationMetrics.mobile);
    });
});
