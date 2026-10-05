/**
 * @module
 * Moving a saved product into the cart changes what a checkout would order, so the next "Place
 * order" must not reuse the key of an attempt whose answer was lost: the key follows a fingerprint of the
 * cart (`cart/domain/checkout-attempt.ts`), and the move changes the cart. Otherwise the server would
 * replay THAT order for a basket that is now different.
 *
 * Transport-mocked like `store.spec.ts`: `orvalMutator` is the seam, and the cart and wishlist
 * stores and the generated client above it are real.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWishlistStore } from '@/modules/wishlist/store.ts';
import { useCartStore } from '@/modules/cart';
import { orvalMutator } from '@/infrastructure/http';
import { aCart, lostAnswer } from '../../../../tests/support/unit/cart-fixtures.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * One request as the transport mock sees it.
 */
interface Request {
    url: string;
    method: string;
    headers?: Record<string, unknown>;
}

/**
 * How many checkouts the transport still has to lose before it answers one.
 */
let checkoutsToLose: number;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: Request) => {
        const route = `${config.method.toUpperCase()} ${config.url}`;
        if (route === 'POST /cart/checkout')
            return checkoutsToLose-- > 0
                ? Promise.reject(lostAnswer())
                : Promise.resolve({ success: true, status: 201, message: 'OK', data: anOrder() });
        if (route === 'POST /wishlist/p1/move-to-cart')
            return Promise.resolve({
                success: true,
                status: 200,
                message: 'OK',
                data: { items: [] }
            });
        return Promise.resolve({
            success: true,
            status: 200,
            message: 'OK',
            data: aCart([['p1', 1]])
        });
    })
}));

/**
 * The `Idempotency-Key` of the last checkout the transport saw.
 *
 * @returns The header value
 */
const lastCheckoutKey = (): unknown =>
    // The generated client passes the per-call options (where the key travels) as the mutator's
    // second argument, next to the request config.
    (
        vi
            .mocked(orvalMutator)
            .mock.calls.findLast(
                ([config]) => (config as Request).url === '/cart/checkout'
            )?.[1] as Pick<Request, 'headers'> | undefined
    )?.headers?.['Idempotency-Key'];

beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    checkoutsToLose = 0;
});

describe('moving a saved product into the cart', () => {
    it('ends the checkout attempt whose answer was lost: the next order carries a new key', async () => {
        const cart = useCartStore();
        checkoutsToLose = 1;
        await cart.checkout().catch(() => undefined);
        const keyOfTheLostAttempt = lastCheckoutKey();

        await useWishlistStore().moveToCart('p1');
        await cart.checkout();

        expect(lastCheckoutKey()).not.toBe(keyOfTheLostAttempt);
    });
});
