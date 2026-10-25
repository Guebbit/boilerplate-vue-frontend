/// <reference types="cypress" />

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
export { PROBLEM_MEDIA_TYPE, rejectEnvelope, type RejectResponse } from '../problem-stub';
