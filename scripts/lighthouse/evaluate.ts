/**
 * @module
 * Turns the Lighthouse reports of every case into failures, warnings and medians. Pure: no I/O.
 *
 * What gates and what only reports is decision D3 (`docs/tools/lighthouse.md#what-gates-and-what-reports`):
 * structure and CLS fail the run, timing is a warning row.
 */
import type { CaseRules } from '../../tests/support/lighthouse/case';
import type { BaselineEnvironment, CaseMetrics, LighthouseBaseline } from './baseline';
import { LOOPBACK_HOSTS } from './chrome';

/** The slice of one audit's result this reads. */
export interface AuditResult {
    /** 0-1, or `null` for not applicable / informative. */
    score: number | null;
    /** How Lighthouse displays the result; `notApplicable`, `manual` and `informative` never fail. */
    scoreDisplayMode: string;
    /** The metric value, for the timing audits. */
    numericValue?: number;
    /** Table rows; only `network-requests` is read. */
    details?: { items?: readonly { url?: string }[] };
}

/** The slice of one Lighthouse report (`lhr`) this reads. */
export interface Report {
    /** The URL the page ended on, after redirects. */
    finalDisplayedUrl: string;
    /** Set when the run itself failed. */
    runtimeError?: { code: string; message: string };
    /** Every audit, by id. */
    audits: Partial<Record<string, AuditResult>>;
    /** Per category: its score and which audits count towards it, with their weight. */
    categories: Partial<
        Record<
            string,
            { score: number | null; auditRefs: readonly { id: string; weight: number }[] }
        >
    >;
    /** The machine's CPU benchmark. */
    environment: { benchmarkIndex: number };
}

/** All runs of one case. */
export interface CaseRuns {
    /** The case's rules. */
    rules: CaseRules;
    /** One report per run. */
    runs: readonly Report[];
}

/** `compare` fails on a hard finding; `measure` turns every failure into a warning. */
export type Mode = 'compare' | 'measure';

/** The outcome of an evaluation. */
export interface Evaluation {
    /** Hard findings: the run exits 1 when any. */
    failures: string[];
    /** Report-only findings. */
    warnings: string[];
    /** Per-metric medians by case id. */
    medians: Record<string, CaseMetrics>;
}

/** A median CLS above this warns (Google's "good" threshold). It reports and never gates: see the tool page. */
export const CLS_LIMIT = 0.1;

/** A timing median may reach this multiple of its baseline before it warns (BE `tests/load/browse.js`). */
export const TIMING_HEADROOM = 1.4;

/** How far the machine's benchmark may differ from the baseline's before timings are not comparable. */
export const BENCHMARK_TOLERANCE = 0.25;

/** Performance audits that gate, by name. */
export const HARD_PERFORMANCE_AUDITS = [
    'viewport-insight',
    'font-display-insight',
    'unsized-images'
] as const;

/** Audits that only report. */
export const REPORT_ONLY_AUDITS = [
    'image-delivery-insight',
    'unused-javascript',
    'legacy-javascript-insight',
    'render-blocking-insight',
    'bf-cache',
    'total-byte-weight'
] as const;

/** Lighthouse counts a numeric audit as passed from this score up. */
const PASS_SCORE = 0.9;

/** Display modes that never fail. */
const NEVER_FAILS = new Set(['notApplicable', 'manual', 'informative']);

/**
 * The middle value, or the mean of the two middle ones.
 *
 * @param values - at least one number
 */
export const median = (values: readonly number[]): number => {
    const sorted = values.toSorted((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Whether one audit in one report passed (or does not apply).
 *
 * @param report - one run
 * @param id - the audit id
 */
export const passed = (report: Report, id: string): boolean => {
    const audit = report.audits[id];
    if (!audit || NEVER_FAILS.has(audit.scoreDisplayMode)) return true;
    return audit.score !== null && audit.score >= PASS_SCORE;
};

/** One numeric audit value of a report; 0 when the audit is missing. */
const value = (report: Report, id: string): number => report.audits[id]?.numericValue ?? 0;

/**
 * The medians of one case's runs.
 *
 * @param runs - the case's reports
 */
export const mediansOf = (runs: readonly Report[]): CaseMetrics => ({
    lcp: median(runs.map((run) => value(run, 'largest-contentful-paint'))),
    fcp: median(runs.map((run) => value(run, 'first-contentful-paint'))),
    tbt: median(runs.map((run) => value(run, 'total-blocking-time'))),
    si: median(runs.map((run) => value(run, 'speed-index'))),
    cls: median(runs.map((run) => value(run, 'cumulative-layout-shift'))),
    performance: median(runs.map((run) => (run.categories.performance?.score ?? 0) * 100))
});

/** The weighted audits of one category, read from the report itself so the list cannot rot. */
const weighted = (report: Report, category: string): string[] =>
    (report.categories[category]?.auditRefs ?? [])
        .filter((ref) => ref.weight > 0)
        .map((ref) => ref.id);

/** The audits of the SEO and best-practices categories a case asserts, plus the named performance ones. */
const hardAudits = (rules: CaseRules, first: Report): string[] => [
    ...new Set([
        ...weighted(first, 'best-practices'),
        ...(rules.seo === true ? weighted(first, 'seo') : []),
        ...HARD_PERFORMANCE_AUDITS
    ])
];

/** Whether an audit failed in more than half the runs. */
const failsMostly = (runs: readonly Report[], id: string): boolean =>
    runs.filter((run) => !passed(run, id)).length * 2 > runs.length;

/** The host of a URL, `undefined` when it is not a URL. */
const hostOf = (url: string): string | undefined => {
    try {
        return new URL(url).hostname === '::1' ? '[::1]' : new URL(url).hostname;
    } catch {
        return undefined;
    }
};

/** Requests of a run that named a host outside this machine. */
export const foreignRequests = (report: Report): string[] =>
    (report.audits['network-requests']?.details?.items ?? [])
        .map((item) => item.url ?? '')
        .filter((url) => {
            if (!/^[a-z][\d+.a-z-]*:/i.test(url) || /^(data|blob|about|chrome):/i.test(url))
                return false;
            const host = hostOf(url);
            return host === undefined || !(LOOPBACK_HOSTS as readonly string[]).includes(host);
        });

/**
 * Hard findings of one case that are not per-audit: the page loads, stays out of the login screen,
 * and asks nobody outside this machine for anything.
 *
 * @param caseRuns - the case's runs
 */
const structuralFailures = (caseRuns: CaseRuns): string[] => {
    const { rules, runs } = caseRuns;
    const failures: string[] = [];
    for (const run of runs) {
        if (run.runtimeError)
            failures.push(`${rules.name}: runtime error ${run.runtimeError.code}`);
        else if (!passed(run, 'http-status-code'))
            failures.push(`${rules.name}: http-status-code failed`);
        else if (/\/login\/?$/.test(new URL(run.finalDisplayedUrl).pathname))
            failures.push(`${rules.name}: ended on the login page`);
        for (const url of foreignRequests(run))
            failures.push(`${rules.name}: a request left this machine: ${url}`);
    }
    return [...new Set(failures)];
};

/**
 * Hard audit findings of one case, after its exceptions, plus the stale-exception findings.
 *
 * @param caseRuns - the case's runs
 * @param exceptions - site-wide plus the case's own, audit id → reason
 * @param failedSomewhere - collects every audit that failed in any case (for site-wide staleness)
 */
const auditFailures = (
    caseRuns: CaseRuns,
    exceptions: Readonly<Record<string, string>>,
    failedSomewhere: Set<string>
): string[] => {
    const { rules, runs } = caseRuns;
    const failures: string[] = [];
    for (const id of hardAudits(rules, runs[0])) {
        const failed = failsMostly(runs, id);
        if (failed) failedSomewhere.add(id);
        if (failed && !(id in exceptions)) failures.push(`${rules.name}: ${id} failed`);
    }
    for (const id of Object.keys(rules.exceptions ?? {}))
        if (!runs.some((run) => !passed(run, id)))
            failures.push(`${rules.name}: stale exception ${id}, it passed in every run`);
    return failures;
};

/**
 * A layout shift above {@link CLS_LIMIT}, as a warning. CLS moves with load timing (a web font
 * swapping in late, data landing after first paint), so a hard gate on it flaps; it is reported
 * until a baseline taken in the pinned CI image shows it is stable enough to gate on.
 */
const shiftWarning = (id: string, now: CaseMetrics): string[] =>
    now.cls > CLS_LIMIT ? [`${id}: median CLS ${now.cls.toFixed(3)} > ${String(CLS_LIMIT)}`] : [];

/** Timing and environment findings (never failures). */
const timingWarnings = (
    id: string,
    now: CaseMetrics,
    baseline: LighthouseBaseline | undefined
): string[] => {
    const before = baseline?.cases[id];
    if (!before) return [`${id}: no baseline for this case`];
    const warnings = (['lcp', 'fcp', 'tbt', 'si'] as const)
        .filter((metric) => now[metric] > before[metric] * TIMING_HEADROOM)
        .map(
            (metric) =>
                `${id}: ${metric} ${now[metric].toFixed(0)} ms > ${(before[metric] * TIMING_HEADROOM).toFixed(0)} ms (baseline ${before[metric].toFixed(0)} × ${String(TIMING_HEADROOM)})`
        );
    if (now.performance < before.performance / TIMING_HEADROOM)
        warnings.push(
            `${id}: performance ${now.performance.toFixed(0)} < ${(before.performance / TIMING_HEADROOM).toFixed(0)}`
        );
    return warnings;
};

/** Whether this machine's benchmark is far from the baseline's. */
const benchmarkWarning = (
    runs: readonly CaseRuns[],
    environment: BaselineEnvironment | undefined
): string[] => {
    if (!environment || runs.length === 0) return [];
    const now = median(
        runs.flatMap((entry) => entry.runs.map((run) => run.environment.benchmarkIndex))
    );
    return Math.abs(now - environment.benchmarkIndex) >
        environment.benchmarkIndex * BENCHMARK_TOLERANCE
        ? [
              `benchmarkIndex ${now.toFixed(0)} vs baseline ${environment.benchmarkIndex.toFixed(0)}: timings are not comparable`
          ]
        : [];
};

/** The report-only audits that failed in a case. */
const insightWarnings = (caseRuns: CaseRuns): string[] =>
    REPORT_ONLY_AUDITS.filter((id) => failsMostly(caseRuns.runs, id)).map(
        (id) => `${caseRuns.rules.name}: ${id} (report only)`
    );

/**
 * Judges every case.
 *
 * @param input - the runs of every case, the committed baseline (if any), the site-wide
 *   exceptions, and the mode
 */
export const evaluate = (input: {
    runs: readonly CaseRuns[];
    baseline: LighthouseBaseline | undefined;
    siteExceptions: Readonly<Record<string, string>>;
    mode: Mode;
}): Evaluation => {
    const { runs, baseline, siteExceptions, mode } = input;
    const failedSomewhere = new Set<string>();
    const medians: Record<string, CaseMetrics> = {};
    const failures: string[] = [];
    const warnings: string[] = benchmarkWarning(runs, baseline?.environment);
    for (const caseRuns of runs) {
        const exceptions = { ...siteExceptions, ...caseRuns.rules.exceptions };
        medians[caseRuns.rules.name] = mediansOf(caseRuns.runs);
        failures.push(
            ...structuralFailures(caseRuns),
            ...auditFailures(caseRuns, exceptions, failedSomewhere)
        );
        warnings.push(
            ...shiftWarning(caseRuns.rules.name, medians[caseRuns.rules.name]),
            ...timingWarnings(caseRuns.rules.name, medians[caseRuns.rules.name], baseline),
            ...insightWarnings(caseRuns)
        );
    }
    for (const id of Object.keys(siteExceptions))
        if (runs.length > 0 && !failedSomewhere.has(id))
            failures.push(`site: stale exception ${id}, it passed in every case`);
    return mode === 'measure'
        ? { failures: [], warnings: [...failures, ...warnings], medians }
        : { failures, warnings, medians };
};

/**
 * The index of the run whose LCP is closest to the median: the one whose HTML report people read.
 *
 * @param runs - at least one report
 */
export const closestToMedian = (runs: readonly Report[]): number => {
    const lcps = runs.map((run) => value(run, 'largest-contentful-paint'));
    const target = median(lcps);
    let best = 0;
    for (const [index, lcp] of lcps.entries())
        if (Math.abs(lcp - target) < Math.abs(lcps[best] - target)) best = index;
    return best;
};
