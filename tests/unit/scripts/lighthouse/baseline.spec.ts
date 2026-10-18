/**
 * `scripts/lighthouse/baseline.ts`: the ratchet only lets the baseline improve.
 */
import { describe, it, expect } from 'vitest';
import {
    ratchet,
    type BaselineEnvironment,
    type CaseMetrics,
    type LighthouseBaseline
} from '../../../../scripts/lighthouse/baseline';

/** The machine every fixture ran on. */
const environment: BaselineEnvironment = {
    lighthouseVersion: '13.5.0',
    chromeVersion: 'Chrome/150',
    benchmarkIndex: 1000
};

/** Metrics with overrides. */
const metrics = (overrides: Partial<CaseMetrics> = {}): CaseMetrics => ({
    lcp: 1000,
    fcp: 500,
    tbt: 100,
    si: 800,
    cls: 0.05,
    performance: 90,
    ...overrides
});

/** A committed baseline of the given cases. */
const baselineOf = (cases: Record<string, CaseMetrics>): LighthouseBaseline => ({
    generatedAt: '2026-01-01T00:00:00.000Z',
    environment,
    cases
});

/** Ratchets `measured` against `current`, declaring exactly the measured cases. */
const apply = (current: LighthouseBaseline | undefined, measured: Record<string, CaseMetrics>) =>
    ratchet(current, measured, environment, Object.keys(measured), '2026-02-01T00:00:00.000Z');

describe('ratchet', () => {
    it('records an improvement', () => {
        const result = apply(baselineOf({ 'a/b': metrics() }), {
            'a/b': metrics({ lcp: 800, performance: 95 })
        });

        expect(result.baseline.cases['a/b']).toMatchObject({ lcp: 800, performance: 95 });
        expect(result.improved).toEqual(['a/b.lcp', 'a/b.performance']);
    });

    it('never records a regression', () => {
        const result = apply(baselineOf({ 'a/b': metrics() }), {
            'a/b': metrics({ lcp: 5000, cls: 0.3, performance: 40 })
        });

        expect(result.baseline.cases['a/b']).toEqual(metrics());
        expect(result.improved).toEqual([]);
    });

    it('adds a new case at what it first measures', () => {
        const result = apply(baselineOf({}), { 'a/b': metrics({ lcp: 1234 }) });

        expect(result.added).toEqual(['a/b']);
        expect(result.baseline.cases['a/b'].lcp).toBe(1234);
    });

    it('drops a case nobody declares any more', () => {
        const current = baselineOf({ 'a/b': metrics(), 'gone/case': metrics() });
        const result = ratchet(current, { 'a/b': metrics() }, environment, ['a/b'], 'now');

        expect(result.dropped).toEqual(['gone/case']);
        expect(Object.keys(result.baseline.cases)).toEqual(['a/b']);
    });

    it('starts from nothing', () => {
        expect(apply(undefined, { 'a/b': metrics() }).added).toEqual(['a/b']);
    });
});
