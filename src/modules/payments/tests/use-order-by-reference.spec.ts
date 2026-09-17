/**
 * @module
 * `useOrderByReference` — the admin's own lookup, and the other thing `payments` publishes beside
 * the panel.
 *
 * What is pinned here is the one rule the plan calls out explicitly: a 404 answers a malformed
 * reference and one matching no order ALIKE, so this composable turns both into the same
 * `notFound` flag rather than surfacing either as a thrown error the caller might render
 * differently. Any other rejection (422 no reference sent, 403 not an admin, a transport failure)
 * is left to reject, for the caller's own toast.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrderByReference } from '@/modules/payments/composables/use-order-by-reference.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

const ORDER = {
    id: 'order-1',
    email: 'shopper@example.com',
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalPrice: 42,
    status: 'pending'
};

let responses: Record<string, unknown>;

/**
 * The reject envelope `onResponseReject` builds, which is the only shape this composable ever
 * catches.
 */
const rejectWith = (status: number, message: string, code = 'STUB_ERROR') =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({ success: false, status, message, errors: [{ code, message }] });

/**
 * A stubbed API-level refusal — `{ status, code, message }` — distinct from a success fixture,
 * which lets a test stub the exact `errors[].code` shape a real 4xx sends.
 */
interface Declined {
    status: number;
    code: string;
    message: string;
}

const isDeclined = (value: unknown): value is Declined =>
    typeof value === 'object' && value !== null && 'code' in value && 'status' in value;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const answer = responses[key];
        if (answer === undefined) return rejectWith(404, `no stub for ${key}`, 'NOT_FOUND');
        if (isDeclined(answer)) return rejectWith(answer.status, answer.message, answer.code);
        return Promise.resolve(parseOrvalFixture(config.method, config.url, answer));
    })
}));

beforeEach(() => {
    vi.clearAllMocks();
    responses = {
        'GET /payments/order-by-reference': orvalEnvelope(ORDER)
    };
});

describe('useOrderByReference', () => {
    it('finds the order behind a reference', () => {
        const { order, findByReference } = useOrderByReference();

        return findByReference('RF132EY8H44VJAVZKX80JRL').then(() => {
            expect(order.value).toMatchObject({ id: 'order-1' });
        });
    });

    it('is loading while the lookup is in flight', () => {
        const { loading, findByReference } = useOrderByReference();

        const pending = findByReference('RF132EY8H44VJAVZKX80JRL');
        expect(loading.value).toBe(true);

        return pending.then(() => {
            expect(loading.value).toBe(false);
        });
    });

    it('reads a 404 as "no order matches this reference", not a crash', () => {
        responses = {};
        const { order, notFound, findByReference } = useOrderByReference();

        return findByReference('nonsense').then(() => {
            expect(order.value).toBeUndefined();
            expect(notFound.value).toBe(true);
        });
    });

    it('clears a stale order once a later lookup misses', () => {
        const { order, notFound, findByReference } = useOrderByReference();

        return findByReference('RF132EY8H44VJAVZKX80JRL')
            .then(() => {
                expect(order.value).toBeDefined();
                responses = {};
                return findByReference('nonsense');
            })
            .then(() => {
                expect(order.value).toBeUndefined();
                expect(notFound.value).toBe(true);
            });
    });

    /**
     * The other half of "absence is an answer": only 404 is. A 422 (no reference sent) or a 403
     * (not an admin) must reach the caller rather than being read as "not found".
     */
    it('lets any other failure through instead of calling it "not found"', () => {
        responses = {
            'GET /payments/order-by-reference': {
                status: 422,
                code: 'VALIDATION_ERROR',
                message: 'ref is required'
            }
        };
        const { notFound, findByReference } = useOrderByReference();

        return expect(findByReference(''))
            .rejects.toMatchObject({ status: 422 })
            .then(() => {
                expect(notFound.value).toBe(false);
            });
    });

    it('resets back to the blank state', () => {
        const { order, notFound, reset, findByReference } = useOrderByReference();

        return findByReference('RF132EY8H44VJAVZKX80JRL').then(() => {
            reset();
            expect(order.value).toBeUndefined();
            expect(notFound.value).toBe(false);
        });
    });
});
