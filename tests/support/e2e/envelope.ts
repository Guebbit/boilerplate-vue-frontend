/// <reference types="cypress" />

import type { ErrorCode } from '../../../contracts/rest/error-codes';

/**
 * Stubbed failure answers shaped like the real thing.
 *
 * A hand-typed `{ success: false, … }` drifts from what `generateReject` builds, and a page that
 * reads `errors[0].message` then passes against a shape the backend never sends. Building the
 * stub here, from the contract's own code list, keeps every stub honest. `declaredStatuses`
 * (a Node task in `cypress.config.ts`) is the other half: it refuses a status the contract does
 * not list for the operation.
 */

/** The HTTP reason phrase the backend puts in `message`, for the statuses a stub is likely to name. */
const REASON_PHRASES: Readonly<Record<number, string>> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    412: 'Precondition Failed',
    413: 'Content Too Large',
    422: 'Unprocessable Content',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
};

/** What `cy.intercept` takes as a static response — the part of it a reject uses. */
export interface RejectResponse {
    /** The HTTP status. */
    statusCode: number;
    /** The reject envelope. */
    body: {
        success: false;
        status: number;
        message: string;
        errors: { code: ErrorCode; message: string }[];
    };
}

/**
 * The reject envelope the backend answers a refusal with.
 *
 * @param status - the HTTP status to stub
 * @param code - a code the contract declares (`ERROR_CODES`); a typo fails to compile
 * @param message - the sentence the page should show; the code's own name when omitted
 */
export const rejectEnvelope = (
    status: number,
    code: ErrorCode,
    message: string = code
): RejectResponse => ({
    statusCode: status,
    body: {
        success: false,
        status,
        message: REASON_PHRASES[status] ?? String(status),
        errors: [{ code, message }]
    }
});

/**
 * Fails the test when the contract does not declare `status` for the operation: the stub would
 * exercise a branch the server cannot produce.
 *
 * @param method - the HTTP verb
 * @param pathTemplate - the path as `openapi.yaml` spells it, e.g. `/orders/{id}/cancel`
 * @param status - the status the stub will answer
 */
export const expectDeclaredStatus = (
    method: string,
    pathTemplate: string,
    status: number
): Cypress.Chainable<number[]> =>
    cy
        .task<number[]>('declaredStatuses', { method, pathTemplate }, { log: false })
        .then((declared) => {
            expect(
                declared,
                `statuses openapi.yaml declares for ${method.toUpperCase()} ${pathTemplate}`
            ).to.include(status);
            return cy.wrap(declared, { log: false });
        });

export { ERROR_CODES, type ErrorCode } from '../../../contracts/rest/error-codes';
