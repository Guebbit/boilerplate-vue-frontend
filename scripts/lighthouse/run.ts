#!/usr/bin/env tsx
/**
 * Runs the Lighthouse audit over every case — `npm run test:lighthouse` (the build and both servers
 * are started by that script).
 *
 * Knobs are env variables, not flags: the npm script hands its arguments to `start-server-and-test`.
 *   LIGHTHOUSE_RUNS  runs per case (default 3; the nightly uses 5)
 *   LIGHTHOUSE_MODE  `compare` (default) or `measure` (every failure is a warning; writes the baseline)
 *
 * Exit 0 fine, 1 a hard finding, 2 no backend / no reports / the sink port taken.
 * See: docs/tools/lighthouse.md
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { siteCases, SITE_EXCEPTIONS } from '../../tests/lighthouse/site';
import type { LighthouseCase } from '../../tests/support/lighthouse/case';
import type { ScenarioDescription } from '../../tests/support/scenario-description';
import { startAnalyticsSink } from './analytics-sink';
import { LIGHTHOUSE_BASELINE_PATH, PROPOSED_BASELINE_PATH, readBaseline } from './baseline';
import { launchAuditBrowser, type AuditBrowser } from './chrome';
import { collectCase, type MeasuredRun } from './collect';
import { closestToMedian, evaluate, type CaseRuns, type Mode } from './evaluate';
import { renderSummary } from './summary';

// `.env` into `process.env`, as `run-shards.ts` does; a missing file is fine (CI passes env).
try {
    process.loadEnvFile();
} catch {
    /* no .env in this checkout */
}

/** The folder the reports go to (gitignored). */
const REPORT_DIR = 'reports/lighthouse';

/** The demo backend every single-process e2e script boots. */
const API_URL = 'http://localhost:3100';

/** `LIGHTHOUSE_RUNS`, default 3. */
const runs = Number(process.env.LIGHTHOUSE_RUNS ?? '3');

/** `LIGHTHOUSE_MODE`, default `compare`. */
const mode: Mode = process.env.LIGHTHOUSE_MODE === 'measure' ? 'measure' : 'compare';

/** Every case: the modules' own files (found by glob, so `demo:remove` takes them) plus the site's. */
const discoverCases = (): Promise<LighthouseCase[]> =>
    Promise.all(
        readdirSync('src/modules')
            .map((name) => path.resolve('src/modules', name, 'tests/lighthouse.ts'))
            .filter((file) => readdirSyncSafe(path.dirname(file)).includes('lighthouse.ts'))
            .map((file) =>
                import(file).then((loaded: { lighthouseCases: readonly LighthouseCase[] }) => [
                    ...loaded.lighthouseCases
                ])
            )
    ).then((fromModules) => [...fromModules.flat(), ...siteCases]);

/** `readdirSync` that answers an empty list for a missing folder. */
const readdirSyncSafe = (directory: string): string[] => {
    try {
        return readdirSync(directory);
    } catch {
        return [];
    }
};

/** What the demo backend seeded; exit 2 if it does not answer. */
const readScenario = (): Promise<ScenarioDescription> =>
    fetch(`${API_URL}/__test/scenario`)
        .then((response) => response.json() as Promise<ScenarioDescription>)
        .catch((error: unknown) => {
            throw new Error(`the demo backend at ${API_URL} did not answer: ${String(error)}`, {
                cause: error
            });
        });

/** Writes one case's JSON runs and the HTML of the run nearest the median. */
const writeReports = (name: string, measured: readonly MeasuredRun[]): void => {
    const directory = path.join(REPORT_DIR, name);
    mkdirSync(directory, { recursive: true });
    for (const [index, entry] of measured.entries())
        writeFileSync(
            path.join(directory, `run-${String(index + 1)}.json`),
            JSON.stringify(entry.lhr)
        );
    writeFileSync(
        path.join(REPORT_DIR, `${name.replaceAll('/', '-')}.html`),
        measured[closestToMedian(measured.map((entry) => entry.report))].html
    );
};

/** Measures every case, one after the other. */
const collectAll = async (
    cases: readonly LighthouseCase[],
    scenario: ScenarioDescription,
    browser: AuditBrowser
): Promise<{ results: CaseRuns[]; measured: MeasuredRun[] }> => {
    const results: CaseRuns[] = [];
    const everyRun: MeasuredRun[] = [];
    for (const audit of cases) {
        const measured = await collectCase(audit, scenario, browser, runs);
        writeReports(audit.name, measured);
        results.push({ rules: audit, runs: measured.map((entry) => entry.report) });
        everyRun.push(...measured);
    }
    return { results, measured: everyRun };
};

Promise.all([discoverCases(), readScenario(), startAnalyticsSink()])
    .then(([cases, scenario, sink]) =>
        launchAuditBrowser()
            .then((browser) =>
                collectAll(cases, scenario, browser)
                    .then(({ results, measured }) => {
                        const baseline = readBaseline();
                        const evaluation = evaluate({
                            runs: results,
                            baseline,
                            siteExceptions: SITE_EXCEPTIONS,
                            mode
                        });
                        const first = measured[0].lhr;
                        writeFileSync(
                            PROPOSED_BASELINE_PATH,
                            `${JSON.stringify(
                                {
                                    generatedAt: new Date().toISOString(),
                                    environment: {
                                        lighthouseVersion: first.lighthouseVersion,
                                        chromeVersion: first.environment.hostUserAgent,
                                        benchmarkIndex: first.environment.benchmarkIndex
                                    },
                                    cases: evaluation.medians
                                },
                                undefined,
                                4
                            )}\n`
                        );
                        const summary = renderSummary(evaluation, baseline);
                        writeFileSync(path.join(REPORT_DIR, 'summary.md'), summary);
                        writeFileSync(
                            path.join(REPORT_DIR, 'summary.json'),
                            JSON.stringify(evaluation, undefined, 4)
                        );
                        console.log(summary);
                        console.log(`(compared with ${LIGHTHOUSE_BASELINE_PATH})`);
                        process.exitCode = evaluation.failures.length > 0 ? 1 : 0;
                    })
                    .finally(() => browser.close())
            )
            .finally(() => sink.close())
    )
    .catch((error: unknown) => {
        console.error(`[lighthouse] ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 2;
    });
