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
 * One file per spec, one entry per audited state: the read-merge-write is `spec-report.ts`.
 */
import { recordSpecEntry } from './spec-report';

/** The subset of an axe `Result` worth keeping — enough to find the element, not the whole DOM. */
export interface A11yViolationRecord {
    id: string;
    impact: string | undefined;
    help: string;
    helpUrl: string;
    tags: string[];
    nodes: { target: string[]; html: string }[];
}

/** One page's axe result, as `cy.checkPageA11y()` sends it to the record task. */
export interface A11yRecordRequest {
    /** `Cypress.spec.relative` — what the file is named after. */
    spec: string;
    /** The label the sweep passed to `cy.checkPageA11y()`, the route's human name. */
    context: string;
    /** Where the page was when axe ran. */
    url: string;
    violations: A11yViolationRecord[];
}

/**
 * Records one audit's findings. Returns the file written, because a task must return something
 * serialisable — `undefined` makes Cypress fail the command.
 *
 * @param request - the audit's identity and its findings
 * @param directory - where the reports go; the config passes `reports/a11y`
 * @returns The absolute path of the report file
 */
export const recordA11yViolations = (request: A11yRecordRequest, directory: string): string =>
    recordSpecEntry(directory, request.spec, request.context, {
        url: request.url,
        recordedAt: new Date().toISOString(),
        violations: request.violations
    });
