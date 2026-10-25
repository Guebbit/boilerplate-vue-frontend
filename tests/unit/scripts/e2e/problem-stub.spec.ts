/**
 * The Cypress stub builder stays on the contract: its body must be assignable to the generated
 * `Problem`, and it must carry the refusal media type the client asks for.
 */
import { describe, expect, it } from 'vitest';
import { PROBLEM_MEDIA_TYPE, rejectEnvelope } from '../../../support/problem-stub.ts';
import type { Problem } from '@types';

describe('rejectEnvelope', () => {
    it('builds problem details of the contract, served as application/problem+json', () => {
        const response = rejectEnvelope(422, 'VALIDATION_ERROR', 'Not an email');
        // The assignment is the check: a member `Problem` adds or requires fails type-check here.
        const body: Problem = response.body;

        expect(response.statusCode).toBe(422);
        expect(response.headers['content-type']).toBe(PROBLEM_MEDIA_TYPE);
        expect(body).toEqual({
            type: 'about:blank',
            title: 'Unprocessable Content',
            status: 422,
            detail: 'Not an email',
            errors: [{ code: 'VALIDATION_ERROR', message: 'Not an email' }]
        });
    });
});
