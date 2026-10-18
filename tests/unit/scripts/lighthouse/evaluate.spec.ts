/**
 * `scripts/lighthouse/evaluate.ts`: what fails the audit run, what only warns, and the medians.
 */
import { describe, it, expect } from 'vitest';
import type { LighthouseBaseline } from '../../../../scripts/lighthouse/baseline';
import {
    closestToMedian,
    evaluate,
    median,
    type AuditResult,
    type CaseRuns,
    type Report
} from '../../../../scripts/lighthouse/evaluate';

/** A passing audit. */
const PASS: AuditResult = { score: 1, scoreDisplayMode: 'binary' };

/** A failing audit. */
const FAIL: AuditResult = { score: 0, scoreDisplayMode: 'binary' };

/**
 * A trimmed Lighthouse report that passes everything, with overrides.
 *
 * @param overrides - audits to replace, and the numeric metrics to set
 */
const report = (
    overrides: {
        audits?: Record<string, AuditResult>;
        lcp?: number;
        cls?: number;
        url?: string;
        requests?: string[];
        benchmark?: number;
        runtimeError?: Report['runtimeError'];
    } = {}
): Report => ({
    finalDisplayedUrl: overrides.url ?? 'http://localhost:8085/en',
    runtimeError: overrides.runtimeError,
    audits: {
        'http-status-code': PASS,
        'largest-contentful-paint': { ...PASS, numericValue: overrides.lcp ?? 1000 },
        'first-contentful-paint': { ...PASS, numericValue: 500 },
        'total-blocking-time': { ...PASS, numericValue: 100 },
        'speed-index': { ...PASS, numericValue: 800 },
        'cumulative-layout-shift': { ...PASS, numericValue: overrides.cls ?? 0 },
        'viewport-insight': PASS,
        'font-display-insight': PASS,
        'unsized-images': PASS,
        'is-on-https': PASS,
        'errors-in-console': PASS,
        'robots-txt': PASS,
        'meta-description': PASS,
        'network-requests': {
            ...PASS,
            details: {
                items: (overrides.requests ?? ['http://localhost:8085/en']).map((url) => ({ url }))
            }
        },
        ...overrides.audits
    },
    categories: {
        performance: { score: 0.9, auditRefs: [] },
        'best-practices': {
            score: 1,
            auditRefs: [
                { id: 'is-on-https', weight: 5 },
                { id: 'errors-in-console', weight: 1 },
                { id: 'a-weightless-one', weight: 0 }
            ]
        },
        seo: {
            score: 1,
            auditRefs: [
                { id: 'robots-txt', weight: 1 },
                { id: 'meta-description', weight: 1 }
            ]
        }
    },
    environment: { benchmarkIndex: overrides.benchmark ?? 1000 }
});

/** A case with the given rules and runs. */
const caseOf = (
    rules: Partial<CaseRuns['rules']> & { name: string },
    ...runs: Report[]
): CaseRuns => ({ rules, runs });

/** Evaluates in compare mode with no baseline and no site exceptions, unless told otherwise. */
const run = (
    runs: CaseRuns[],
    options: {
        baseline?: LighthouseBaseline;
        site?: Record<string, string>;
        mode?: 'compare' | 'measure';
    } = {}
) =>
    evaluate({
        runs,
        baseline: options.baseline,
        siteExceptions: options.site ?? {},
        mode: options.mode ?? 'compare'
    });

/** The evaluation of a case whose three runs all shift the layout by `cls`. */
const atCls = (cls: number) =>
    run([caseOf({ name: 'x/y' }, report({ cls }), report({ cls }), report({ cls }))]);

describe('median', () => {
    it('takes the middle of an odd count', () => {
        expect(median([5, 1, 3])).toBe(3);
    });

    it('averages the two middle values of an even count', () => {
        expect(median([4, 1, 3, 2])).toBe(2.5);
    });
});

describe('evaluate · the hard set', () => {
    it('is green for a page that passes everything', () => {
        expect(
            run([caseOf({ name: 'shell/home' }, report(), report(), report())]).failures
        ).toEqual([]);
    });

    it('fails a weighted best-practices audit and ignores a weight-0 one', () => {
        const failing = report({ audits: { 'is-on-https': FAIL, 'a-weightless-one': FAIL } });

        expect(run([caseOf({ name: 'x/y' }, failing, failing, failing)]).failures).toEqual([
            'x/y: is-on-https failed'
        ]);
    });

    it('fails once a named performance audit does', () => {
        const failing = report({ audits: { 'unsized-images': FAIL } });

        expect(run([caseOf({ name: 'x/y' }, failing)]).failures).toEqual([
            'x/y: unsized-images failed'
        ]);
    });

    it('asserts SEO audits only on a case marked seo', () => {
        const failing = report({ audits: { 'meta-description': FAIL } });

        expect(run([caseOf({ name: 'cart/guest' }, failing)]).failures).toEqual([]);
        expect(run([caseOf({ name: 'shell/home', seo: true }, failing)]).failures).toEqual([
            'shell/home: meta-description failed'
        ]);
    });

    it('counts a failure only when it hits more than half the runs', () => {
        const bad = report({ audits: { 'is-on-https': FAIL } });

        expect(run([caseOf({ name: 'x/y' }, bad, report(), report())]).failures).toEqual([]);
        expect(run([caseOf({ name: 'x/y' }, bad, bad, report())]).failures).toHaveLength(1);
    });

    it('fails when the page ends on the login screen, errors out, or answers an error status', () => {
        expect(
            run([caseOf({ name: 'a/b' }, report({ url: 'http://localhost:8085/en/login' }))])
                .failures
        ).toHaveLength(1);
        expect(
            run([
                caseOf({ name: 'a/b' }, report({ runtimeError: { code: 'NO_FCP', message: 'x' } }))
            ]).failures
        ).toEqual(['a/b: runtime error NO_FCP']);
        expect(
            run([caseOf({ name: 'a/b' }, report({ audits: { 'http-status-code': FAIL } }))])
                .failures
        ).toEqual(['a/b: http-status-code failed']);
    });
});

describe('evaluate · nothing leaves the machine', () => {
    it('fails a request to an outside host, even one that was blocked', () => {
        const leaking = report({
            requests: ['http://localhost:8085/en', 'https://fonts.googleapis.com/css']
        });

        expect(run([caseOf({ name: 'x/y' }, leaking)]).failures).toEqual([
            'x/y: a request left this machine: https://fonts.googleapis.com/css'
        ]);
    });

    it('allows loopback hosts and data URLs', () => {
        const local = report({
            requests: [
                'http://127.0.0.1:3100/shop',
                'http://[::1]:3100/x',
                'data:image/png;base64,AAAA'
            ]
        });

        expect(run([caseOf({ name: 'x/y' }, local)]).failures).toEqual([]);
    });
});

describe('evaluate · exceptions', () => {
    it('excuses an audit the case names, with a reason', () => {
        const failing = report({ audits: { 'is-on-https': FAIL } });
        const rules = { name: 'x/y', exceptions: { 'is-on-https': 'because' } };

        expect(run([caseOf(rules, failing)]).failures).toEqual([]);
    });

    it('fails a case exception whose audit passed in every run', () => {
        const rules = { name: 'x/y', exceptions: { 'is-on-https': 'because' } };

        expect(run([caseOf(rules, report(), report())]).failures).toEqual([
            'x/y: stale exception is-on-https, it passed in every run'
        ]);
    });

    it('excuses a site-wide exception everywhere, and fails it once no case needs it', () => {
        const failing = report({ audits: { 'robots-txt': FAIL } });
        const site = { 'robots-txt': 'no robots.txt yet' };

        expect(run([caseOf({ name: 'a/b', seo: true }, failing)], { site }).failures).toEqual([]);
        expect(run([caseOf({ name: 'a/b', seo: true }, report())], { site }).failures).toEqual([
            'site: stale exception robots-txt, it passed in every case'
        ]);
    });
});

describe('evaluate · timing only warns', () => {
    const baseline: LighthouseBaseline = {
        generatedAt: '2026-01-01T00:00:00.000Z',
        environment: {
            lighthouseVersion: '13.5.0',
            chromeVersion: 'Chrome/150',
            benchmarkIndex: 1000
        },
        cases: { 'x/y': { lcp: 1000, fcp: 500, tbt: 100, si: 800, cls: 0, performance: 90 } }
    };

    it('warns, and never fails, when LCP passes baseline × 1.4', () => {
        const slow = report({ lcp: 1500 });
        const result = run([caseOf({ name: 'x/y' }, slow)], { baseline });

        expect(result.failures).toEqual([]);
        expect(result.warnings.some((line) => line.startsWith('x/y: lcp 1500 ms > 1400 ms'))).toBe(
            true
        );
    });

    it('stays quiet within the headroom', () => {
        expect(
            run([caseOf({ name: 'x/y' }, report({ lcp: 1400 }))], { baseline }).warnings
        ).toEqual([]);
    });

    it('says when a case has no baseline', () => {
        expect(run([caseOf({ name: 'x/y' }, report())]).warnings).toEqual([
            'x/y: no baseline for this case'
        ]);
    });

    it('warns when the machine benchmark moved by more than a quarter', () => {
        const result = run([caseOf({ name: 'x/y' }, report({ benchmark: 600 }))], { baseline });

        expect(result.warnings.some((line) => line.includes('timings are not comparable'))).toBe(
            true
        );
    });

    it('warns at a median CLS of 0.11, stays quiet at exactly 0.1, and never fails on it', () => {
        expect(atCls(0.11).warnings).toContain('x/y: median CLS 0.110 > 0.1');
        expect(atCls(0.11).failures).toEqual([]);
        expect(atCls(0.1).warnings.filter((line) => line.includes('CLS'))).toEqual([]);
    });

    it('turns every failure into a warning in measure mode', () => {
        const failing = report({ audits: { 'is-on-https': FAIL } });
        const result = run([caseOf({ name: 'x/y' }, failing)], { mode: 'measure' });

        expect(result.failures).toEqual([]);
        expect(result.warnings).toContain('x/y: is-on-https failed');
    });

    it('reports a report-only insight without failing', () => {
        const noisy = report({ audits: { 'unused-javascript': FAIL } });
        const result = run([caseOf({ name: 'x/y' }, noisy)]);

        expect(result.failures).toEqual([]);
        expect(result.warnings).toContain('x/y: unused-javascript (report only)');
    });
});

describe('closestToMedian', () => {
    it('picks the run nearest the median LCP', () => {
        const runs = [report({ lcp: 900 }), report({ lcp: 3000 }), report({ lcp: 1100 })];

        expect(closestToMedian(runs)).toBe(2);
    });
});
