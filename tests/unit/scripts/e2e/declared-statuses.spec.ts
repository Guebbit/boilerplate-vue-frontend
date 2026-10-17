/**
 * `scripts/e2e/declared-statuses.ts` — the statuses the contract lists for one operation.
 */
import { describe, expect, it } from 'vitest';
import { declaredStatuses } from '../../../../scripts/e2e/declared-statuses';

const SPEC = `
paths:
  /orders/{id}/cancel:
    post:
      responses:
        "200": { description: ok }
        "409": { description: conflict }
        "404": { description: missing }
        default: { description: other }
`;

describe('declaredStatuses', () => {
    it('lists the numeric statuses of the operation, ascending', () => {
        expect(declaredStatuses(SPEC, 'POST', '/orders/{id}/cancel')).toEqual([200, 404, 409]);
    });

    it('is empty for an operation or a path the contract does not carry', () => {
        expect(declaredStatuses(SPEC, 'GET', '/orders/{id}/cancel')).toEqual([]);
        expect(declaredStatuses(SPEC, 'POST', '/nope')).toEqual([]);
    });
});
