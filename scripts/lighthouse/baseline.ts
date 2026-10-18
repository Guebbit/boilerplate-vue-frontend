/**
 * @module
 * The Lighthouse timing baseline, and the ratchet that only ever lets it improve.
 *
 * Same rule as `scripts/mutation/baseline.ts`: a number is recorded when it gets better, a new case
 * is recorded at what it first measures, and raising one is a person's commit with a reason.
 * Nothing in it gates (D3): timing is a report, so a fork inherits numbers, not a verdict.
 * See: docs/tools/lighthouse.md#baseline-and-ratchet
 */
import { existsSync, readFileSync } from 'node:fs';

/** Where the committed baseline lives, relative to the repo root. */
export const LIGHTHOUSE_BASELINE_PATH = 'lighthouse-baseline.json';

/** Where the runner writes the proposed baseline next to its reports. */
export const PROPOSED_BASELINE_PATH = 'reports/lighthouse/lighthouse-baseline.json';

/** The medians of one case, in the units Lighthouse reports. */
export interface CaseMetrics {
    /** Largest Contentful Paint, ms. */
    lcp: number;
    /** First Contentful Paint, ms. */
    fcp: number;
    /** Total Blocking Time, ms (the lab stand-in for INP). */
    tbt: number;
    /** Speed Index, ms. */
    si: number;
    /** Cumulative Layout Shift, unitless. */
    cls: number;
    /** The performance category score, 0-100. */
    performance: number;
}

/** Which machine took the numbers: timings from different machines are not comparable. */
export interface BaselineEnvironment {
    /** The `lighthouse` package version. */
    lighthouseVersion: string;
    /** The Chrome version string. */
    chromeVersion: string;
    /** Lighthouse's CPU benchmark of the machine. */
    benchmarkIndex: number;
}

/** The committed file. */
export interface LighthouseBaseline {
    /** ISO-8601 time of the run. */
    generatedAt: string;
    /** The machine the numbers belong to. */
    environment: BaselineEnvironment;
    /** Case id (`<module>/<name>`) → medians. */
    cases: Record<string, CaseMetrics>;
}

/** The metrics where a smaller number is better. */
const LOWER_IS_BETTER = ['lcp', 'fcp', 'tbt', 'si', 'cls'] as const;

/** What {@link ratchet} did, for the printed summary. */
export interface RatchetResult {
    /** The baseline to write. */
    baseline: LighthouseBaseline;
    /** Case ids recorded for the first time. */
    added: string[];
    /** `case.metric` pairs that improved. */
    improved: string[];
    /** Case ids the baseline had that no case declares any more. */
    dropped: string[];
}

/**
 * Applies one run to the recorded baseline: improvements and new cases in, regressions ignored,
 * cases nobody declares any more out.
 *
 * @param current - the committed baseline, or `undefined` when there is none yet
 * @param measured - the medians of this run, by case id
 * @param environment - the machine of this run
 * @param declared - every case id the case files declare now
 * @param generatedAt - ISO-8601 time stamped on the result
 */
export const ratchet = (
    current: LighthouseBaseline | undefined,
    measured: Readonly<Partial<Record<string, CaseMetrics>>>,
    environment: BaselineEnvironment,
    declared: readonly string[],
    generatedAt: string
): RatchetResult => {
    const previous: Partial<Record<string, CaseMetrics>> = current?.cases ?? {};
    const added: string[] = [];
    const improved: string[] = [];
    const cases: Record<string, CaseMetrics> = {};
    for (const id of declared) {
        const now = measured[id];
        if (!now) continue;
        const before = previous[id];
        if (!before) {
            added.push(id);
            cases[id] = now;
            continue;
        }
        const next = { ...before };
        for (const metric of LOWER_IS_BETTER)
            if (now[metric] < before[metric]) {
                next[metric] = now[metric];
                improved.push(`${id}.${metric}`);
            }
        if (now.performance > before.performance) {
            next.performance = now.performance;
            improved.push(`${id}.performance`);
        }
        cases[id] = next;
    }
    const dropped = Object.keys(previous).filter((id) => !declared.includes(id));
    return { baseline: { generatedAt, environment, cases }, added, improved, dropped };
};

/**
 * Reads the committed baseline.
 *
 * @param file - path to read; defaults to {@link LIGHTHOUSE_BASELINE_PATH}
 * @returns the parsed baseline, or `undefined` when the file does not exist yet
 */
export const readBaseline = (
    file: string = LIGHTHOUSE_BASELINE_PATH
): LighthouseBaseline | undefined =>
    existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as LighthouseBaseline) : undefined;
