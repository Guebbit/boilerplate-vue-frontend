/**
 * Typed factories for a return and a returns-list row, proven against the generated response
 * schema as every factory in `tests/support/unit/fixtures.ts` is.
 */
import { GetReturnByIdResponse } from '@api/schemas';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import type { Return, ReturnListItem } from '@types';

/**
 * A valid return as `GET /returns/{id}` answers it — one line, approved, nothing yet open to staff.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Return` that parses against the generated schema
 */
export const aReturn = (overrides: Partial<Return> = {}): Return =>
    contractBody<Return>(GetReturnByIdResponse, {
        id: 'r1',
        orderId: 'o1',
        orderNumber: '2026-000001',
        currency: 'EUR',
        status: 'approved',
        reason: 'withdrawal',
        kind: 'return',
        lines: [{ productId: 'p1', quantity: 1, title: 'Shirt', unitPrice: '30.00' }],
        returnPostage: 'consumer',
        requestedAt: '2026-09-01T10:00:00.000Z',
        openedBy: 'buyer',
        policyExceptions: [],
        createdAt: '2026-09-01T10:00:00.000Z',
        actions: {
            approve: false,
            decline: false,
            receive: false,
            recordProof: false,
            close: false,
            cancel: false
        },
        ...overrides
    });

/**
 * A row of the returns list as `GET /returns` answers it: the table's fields, no note or lines.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `ReturnListItem`
 */
export const aReturnListItem = (overrides: Partial<ReturnListItem> = {}): ReturnListItem => ({
    id: 'r1',
    orderId: 'o1',
    orderNumber: '2026-000001',
    status: 'approved',
    reason: 'withdrawal',
    kind: 'return',
    requestedAt: '2026-09-01T10:00:00.000Z',
    createdAt: '2026-09-01T10:00:00.000Z',
    actions: {
        approve: false,
        decline: false,
        receive: false,
        recordProof: false,
        close: false,
        cancel: false
    },
    ...overrides
});
