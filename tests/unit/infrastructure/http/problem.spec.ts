/**
 * `readProblemBody` and `syntheticProblem`: the two halves of how this client handles problem
 * details it did not parse itself. The first reads a refusal that axios handed over as text or a
 * Blob (a `responseType` that skips its JSON parse); the second builds one when nothing answered.
 */
import { describe, expect, it } from 'vitest';
import { readProblemBody, syntheticProblem } from '@/infrastructure/http/problem.ts';
import { aProblem } from '../../../support/unit/fixtures.ts';

/** The refusal an orders export answers over the cap. */
const TOO_LARGE = aProblem(422, [{ code: 'ORDER_EXPORT_TOO_LARGE', message: 'Too many rows' }]);

/** The header a refusal carries. */
const PROBLEM_HEADERS = { 'content-type': 'application/problem+json; charset=utf-8' };

describe('readProblemBody', () => {
    it('parses a problem body that arrived as text', () =>
        readProblemBody({ data: JSON.stringify(TOO_LARGE), headers: PROBLEM_HEADERS }).then(
            (body) => {
                expect(body).toEqual(TOO_LARGE);
            }
        ));

    it('parses a problem body that arrived as a Blob', () =>
        readProblemBody({
            data: new Blob([JSON.stringify(TOO_LARGE)], { type: 'application/problem+json' }),
            headers: PROBLEM_HEADERS
        }).then((body) => {
            expect(body).toEqual(TOO_LARGE);
        }));

    it('leaves a file alone: its bytes are not a problem, whatever they look like', () => {
        const csv = new Blob(['a,b\n'], { type: 'text/csv' });
        return readProblemBody({ data: csv, headers: { 'content-type': 'text/csv' } }).then(
            (body) => {
                expect(body).toBe(csv);
            }
        );
    });

    it('hands back text that claims to be a problem but is not JSON, unread', () =>
        readProblemBody({ data: 'not json', headers: PROBLEM_HEADERS }).then((body) => {
            expect(body).toBe('not json');
        }));

    it('passes an already-parsed object through', () =>
        readProblemBody({ data: TOO_LARGE, headers: PROBLEM_HEADERS }).then((body) => {
            expect(body).toBe(TOO_LARGE);
        }));
});

describe('syntheticProblem', () => {
    it('carries one error item, which is also the detail', () => {
        expect(syntheticProblem(0, 'Network Error', 'TIMEOUT', 'Timed out')).toEqual({
            type: 'about:blank',
            title: 'Network Error',
            status: 0,
            detail: 'Timed out',
            errors: [{ code: 'TIMEOUT', message: 'Timed out' }]
        });
    });
});
