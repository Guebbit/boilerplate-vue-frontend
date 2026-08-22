/**
 * The Node half of `cy.checkPageA11y()`: every axe finding, written to disk.
 *
 * The browser half gates on `serious`/`critical` and LOGS the rest — and a Cypress log is read in
 * `cypress open` and by nobody in `cypress run`. So the lighter findings were on the record only
 * in the sense that a line scrolled past once. This task puts them somewhere that survives the
 * run: one JSON file per spec under `reports/a11y/`, uploaded by CI as an artifact, so the day the
 * threshold is tightened starts from data rather than from a rediscovery.
 *
 * A `cy.task` because the browser cannot write a file, same as the visual diff in
 * `visual-task.ts`. Registered in `cypress.config.ts`.
 *
 * One file per spec, one entry per audited state, keyed by the state's label: a retried test
 * (see `retries` in the config) overwrites its own entry rather than appending a duplicate, and
 * the four CI shards each run their own specs, so no two processes write the same file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** The subset of an axe `Result` worth keeping — enough to find the element, not the whole DOM. */
export interface A11yViolationRecord {
    id: string;
    impact: string | undefined;
    help: string;
    helpUrl: string;
    tags: string[];
    nodes: { target: string[]; html: string }[];
}

export interface A11yRecordRequest {
    /** `Cypress.spec.relative` — what the file is named after. */
    spec: string;
    /** The label the sweep passed to `cy.checkPageA11y()`, the route's human name. */
    context: string;
    /** Where the page was when axe ran. */
    url: string;
    violations: A11yViolationRecord[];
}

interface A11yReportEntry {
    url: string;
    recordedAt: string;
    violations: A11yViolationRecord[];
}

interface A11yReport {
    spec: string;
    entries: Record<string, A11yReportEntry>;
}

/** `src/modules/users/tests/e2e/a11y.cy.ts` → `src-modules-users-tests-e2e-a11y-cy`. */
export const specSafeName = (spec: string): string =>
    spec.replace(/\.ts$/, '').replaceAll(/[^\dA-Za-z]+/g, '-');

const readReport = (file: string, spec: string): A11yReport => {
    try {
        return JSON.parse(readFileSync(file, 'utf8')) as A11yReport;
    } catch {
        // First write for this spec, or a file a crashed run left half-written: either way the
        // entries being recorded now are the ones that count.
        return { spec, entries: {} };
    }
};

/**
 * Records one audit's findings. Returns the file written, because a task must return something
 * serialisable — `undefined` makes Cypress fail the command.
 *
 * @param request - the audit's identity and its findings
 * @param directory - where the reports go; the config passes `reports/a11y`
 * @returns The absolute path of the report file
 */
export const recordA11yViolations = (request: A11yRecordRequest, directory: string): string => {
    mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `${specSafeName(request.spec)}.json`);
    const report = readReport(file, request.spec);
    report.entries[request.context] = {
        url: request.url,
        recordedAt: new Date().toISOString(),
        violations: request.violations
    };
    writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
    return file;
};
