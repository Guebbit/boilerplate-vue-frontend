/**
 * @module
 * The Node half of `cy.checkTouchReachable()`: every touch finding, written to disk.
 *
 * A Cypress log is read in `cypress open` and by nobody in `cypress run`, so the findings that do
 * not fail a test (the hints) would scroll past once. This puts them in `reports/touch/<spec>.json`,
 * uploaded by CI like the a11y reports. A `cy.task` because the browser cannot write a file.
 * Registered in `cypress.config.ts`.
 */
import type { TouchFinding } from '../../../scripts/e2e/touch-findings';
import { recordSpecEntry } from './spec-report';

/** One page's scan, as `cy.checkTouchReachable()` sends it to the record task. */
export interface TouchRecordRequest {
    /** `Cypress.spec.relative` — what the file is named after. */
    spec: string;
    /** The label the caller passed to `cy.checkTouchReachable()`. */
    context: string;
    /** Where the page was when it was scanned. */
    url: string;
    findings: TouchFinding[];
}

/**
 * Records one scan's findings.
 *
 * @param request - the scan's identity and its findings
 * @param directory - where the reports go; the config passes `reports/touch`
 * @returns The absolute path of the report file
 */
export const recordTouchFindings = (request: TouchRecordRequest, directory: string): string =>
    recordSpecEntry(directory, request.spec, request.context, {
        url: request.url,
        recordedAt: new Date().toISOString(),
        findings: request.findings
    });
