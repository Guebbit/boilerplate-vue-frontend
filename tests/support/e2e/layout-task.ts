/**
 * @module
 * The Node half of `cy.checkLayout()`: every layout finding, written to disk.
 *
 * The browser half fails on the blocking findings and the Cypress log is read by nobody in
 * `cypress run`, so the advisory and the accepted findings would scroll past once. This puts
 * them in `reports/a11y/<spec>.layout.json`, beside the axe report CI already uploads. A
 * `cy.task` because the browser cannot write a file. Registered in `cypress.config.ts`.
 */
import type { LayoutFinding } from '../../../scripts/e2e/layout-findings';
import { recordSpecEntry } from './spec-report';

/** One audited state's findings, as `cy.checkLayout()` sends them to the record task. */
export interface LayoutRecordRequest {
    /** `Cypress.spec.relative` — what the file is named after. */
    spec: string;
    /** The state's label, size and text mode: the report entry's key. */
    context: string;
    /** Where the page was when the checks ran. */
    url: string;
    findings: LayoutFinding[];
}

/**
 * Records one audited state's findings, the accepted and the advisory ones included.
 *
 * @param request - the state's identity and its findings
 * @param directory - where the reports go; the config passes `reports/a11y`
 * @returns The absolute path of the report file
 */
export const recordLayoutFindings = (request: LayoutRecordRequest, directory: string): string =>
    recordSpecEntry(
        directory,
        request.spec,
        request.context,
        {
            url: request.url,
            recordedAt: new Date().toISOString(),
            findings: request.findings
        },
        '.layout'
    );
