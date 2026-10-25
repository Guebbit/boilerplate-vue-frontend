import type { ErrorCode } from '../../contracts/rest/error-codes';

/**
 * Stubbed failure answers shaped like the real thing.
 *
 * A hand-typed `{ … }` drifts from what `rejectResponse` builds, and a page that reads
 * `errors[0].message` then passes against a shape the backend never sends. Building the stub here,
 * typed on the contract's own `Problem` and its code list, keeps every stub honest.
 * `declaredStatuses` (a Node task in `cypress.config.ts`) is the other half: it refuses a status
 * the contract does not list for the operation.
 */

/** The English RFC 9110 phrase the backend puts in `title`, for the statuses a stub is likely to name. */
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

/** The media type every backend refusal carries (RFC 9457). */
export const PROBLEM_MEDIA_TYPE = 'application/problem+json';

/**
 * The contract's `Problem`, written out: importing the generated type would drag the whole app
 * through `contracts/rest/index.ts` into the Cypress project. `envelope.spec.ts` assigns a
 * stub's body to the generated `Problem`, so a member the contract adds fails there.
 */
export interface ProblemBody {
    /** Always `about:blank`. */
    type: 'about:blank';
    /** The English status phrase. */
    title: string;
    /** The HTTP status. */
    status: number;
    /** The sentence a user reads. */
    detail: string;
    /** The machine-readable items. */
    errors: { code: ErrorCode; message: string }[];
}

/** What `cy.intercept` takes as a static response — the part of it a reject uses. */
export interface RejectResponse {
    /** The HTTP status. */
    statusCode: number;
    /** The refusal's media type, so the client reads it as the real thing. */
    headers: { 'content-type': typeof PROBLEM_MEDIA_TYPE };
    /** The problem details. */
    body: ProblemBody;
}

/**
 * The problem details the backend answers a refusal with.
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
    headers: { 'content-type': PROBLEM_MEDIA_TYPE },
    body: {
        type: 'about:blank',
        title: REASON_PHRASES[status] ?? String(status),
        status,
        detail: message,
        errors: [{ code, message }]
    }
});
