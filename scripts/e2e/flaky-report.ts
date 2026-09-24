/**
 * Tests that passed only on a retry — collected, not hidden.
 *
 * `cypress.config.ts` allows one retry in `cypress run`, which keeps contention from failing a run.
 * The price is that a flaky test goes green silently. This module is the other half of that
 * trade: Cypress' `after:spec` hook records every test whose final attempt passed after an earlier
 * one failed, and the runners print the list at the end of the run.
 *
 * Fail-soft on purpose. A retry-pass is a signal to look at, not a verdict: failing the run would
 * turn `retries` back into zero with extra steps. So it is reported as a GitHub warning annotation
 * in CI and a plain list elsewhere — visible on the PR, never red.
 *
 * One JSON object per line, appended, because four shards write to the same file at once and a
 * short `appendFileSync` is the one write that cannot interleave another shard's half-line.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

/** Where every Cypress process appends its retry-passes. Under `reports/`, which is gitignored. */
export const FLAKY_REPORT_FILE = path.resolve(
    import.meta.dirname,
    '..',
    '..',
    'reports',
    'e2e',
    'flaky.jsonl'
);

/** One test that failed at least once and then passed. */
export interface FlakyTest {
    /** The spec file, relative to the repo root, as Cypress names it. */
    spec: string;
    /** The test's full title: every `describe` level, then the `it`. */
    title: string;
    /** How many attempts it took to pass — always at least 2. */
    attempts: number;
}

/** The slice of one Cypress test result this module reads — see `after:spec`'s `results.tests`. */
export interface TestResultLike {
    /** Every title level, outermost first. */
    title: readonly string[];
    /** The final outcome, after retries. */
    state: string;
    /** One entry per attempt, the last one being the one that counted. */
    attempts: readonly unknown[];
}

/**
 * The retry-passes in one spec's results.
 *
 * @param spec - the spec file those results belong to
 * @param tests - Cypress' per-test results for that spec
 * @returns every test that passed on a later attempt than the first
 */
export const flakyTestsIn = (spec: string, tests: readonly TestResultLike[]): FlakyTest[] =>
    tests
        .filter((test) => test.state === 'passed' && test.attempts.length > 1)
        .map((test) => ({ spec, title: test.title.join(' › '), attempts: test.attempts.length }));

/**
 * Appends retry-passes to the report. Writes nothing (and creates nothing) for an empty list.
 *
 * @param entries - what one spec produced
 * @param file - the report file, {@link FLAKY_REPORT_FILE} unless a test points elsewhere
 */
export const recordFlakyTests = (entries: readonly FlakyTest[], file = FLAKY_REPORT_FILE): void => {
    if (entries.length === 0) return;
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, entries.map((entry) => `${JSON.stringify(entry)}\n`).join(''));
};

/**
 * Removes the previous run's report, so a run reports only its own retries.
 *
 * @param file - the report file
 */
export const resetFlakyReport = (file = FLAKY_REPORT_FILE): void => {
    rmSync(file, { force: true });
};

/**
 * Reads the report back. A line that does not parse is skipped rather than thrown on — a report
 * about flakiness is not worth failing a run over.
 *
 * @param file - the report file
 * @returns every recorded retry-pass, in the order they were written
 */
export const readFlakyTests = (file = FLAKY_REPORT_FILE): FlakyTest[] => {
    if (!existsSync(file)) return [];
    return readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .flatMap((line) => {
            try {
                // This module is the file's only writer, so a line that parses is a FlakyTest.
                return [JSON.parse(line) as FlakyTest];
            } catch {
                return [];
            }
        });
};

/**
 * The report as terminal lines — with a GitHub `::warning` annotation per test when `annotate` is
 * set, which is what puts each one on the PR's checks page.
 * https://docs.github.com/actions/reference/workflow-commands-for-github-actions#setting-a-warning-message
 *
 * @param entries - the retry-passes to report
 * @param annotate - true under GitHub Actions
 * @returns the lines to print; empty when nothing was flaky
 */
export const formatFlakyReport = (entries: readonly FlakyTest[], annotate: boolean): string[] => {
    if (entries.length === 0) return [];
    const header = `[e2e] ${entries.length} test(s) passed only on a retry — flaky, not green:`;
    const lines = entries.map((entry) =>
        annotate
            ? `::warning file=${entry.spec},title=Flaky e2e test::${entry.title} (passed on attempt ${entry.attempts})`
            : `  - ${entry.spec} › ${entry.title} (attempt ${entry.attempts})`
    );
    return [header, ...lines];
};

/**
 * Prints the report for this run, and returns how many entries it had.
 *
 * @param file - the report file
 * @returns the number of retry-passes reported
 */
export const printFlakyReport = (file = FLAKY_REPORT_FILE): number => {
    const entries = readFlakyTests(file);
    for (const line of formatFlakyReport(entries, process.env.GITHUB_ACTIONS === 'true'))
        console.warn(line);
    return entries.length;
};
