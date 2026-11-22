/**
 * @module
 * What stock did to a signed-in line's last write is written beside that line, in words, and
 * stays until the line is written again: not only a toast that vanishes. Mounted over the real
 * cart store (`mount-cart-page.ts`), the warning put in the store the way a clamped write does.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { getCart, updateCartItemByProductId } from '@api';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { loadLocale } from '@/i18n';
import { asStub } from '../../../../tests/support/stub.ts';
import { aCart } from './cart-fixtures.ts';
import { answered } from '../../../../tests/support/unit/async-answers.ts';
import { mountCartPage, router } from './mount-cart-page.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    getCart: vi.fn(),
    updateCartItemByProductId: vi.fn()
}));

beforeEach(() => {
    sessionStorage.clear();
    vi.resetAllMocks();
    setActivePinia(createPinia());
    useSessionStore().viewer = asStub<SessionViewer>({ id: 'u1', email: 'u1@example.com' });
    vi.mocked(getCart).mockResolvedValue(
        answered(
            aCart([
                ['p1', 2],
                ['p2', 1]
            ])
        )
    );
    return loadLocale('en').then(() => router.push('/en/cart').then(() => router.isReady()));
});

/**
 * Mounts the page over a two-line cart.
 *
 * @returns The page and its real store.
 */
const openCart = () =>
    mountCartPage(
        aCart([
            ['p1', 2],
            ['p2', 1]
        ])
    );

/**
 * What a clamped write leaves for a product: 25 asked for, 20 could be had.
 *
 * @param productId - The product the write was for.
 * @returns The warning as the cart store keeps it.
 */
const clamp = (productId: string) => ({
    code: 'MERCHANDISE_NOT_ENOUGH_STOCK' as const,
    productId,
    requested: 25,
    resulting: 20
});

describe('the warning beside a line', () => {
    it('says what the clamp did, beside the line it happened to and no other', async () => {
        const { wrapper, cart } = await openCart();

        cart.lineWarnings = {
            p1: {
                code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
                productId: 'p1',
                requested: 25,
                resulting: 20
            }
        };
        await flushPromises();

        const warnings = wrapper.findAll('[data-test=cart-line-warning]');
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.text()).toBe(
            'Only 20 available, so the line was set to 20 instead of 25.'
        );
        // One polite live region, so it is read once when it appears.
        expect(warnings[0]?.attributes('role')).toBe('status');
        // Beside the first line, not the second.
        expect(
            wrapper
                .findAll('[data-test=cart-item]')[0]
                ?.element.parentElement?.contains(warnings[0]?.element ?? null)
        ).toBe(true);
    });

    it('says a sold-out product could not be bought at all', async () => {
        const { wrapper, cart } = await openCart();

        cart.lineWarnings = {
            p2: {
                code: 'MERCHANDISE_OUT_OF_STOCK',
                productId: 'p2',
                requested: 1,
                resulting: 0
            }
        };
        await flushPromises();

        expect(wrapper.get('[data-test=cart-line-warning]').text()).toContain(
            'cannot be bought right now, so nothing was added'
        );
    });

    it('is absent when every write landed as asked', async () => {
        const { wrapper } = await openCart();

        expect(wrapper.find('[data-test=cart-line-warning]').exists()).toBe(false);
    });

    it('goes when the line is written again, and only that line’s', async () => {
        const { wrapper, cart } = await openCart();
        cart.lineWarnings = { p1: clamp('p1'), p2: clamp('p2') };
        await flushPromises();
        expect(wrapper.findAll('[data-test=cart-line-warning]')).toHaveLength(2);
        // The server takes the write as asked: no warnings in its answer.
        vi.mocked(updateCartItemByProductId).mockResolvedValue(
            answered(
                aCart([
                    ['p1', 1],
                    ['p2', 1]
                ])
            )
        );

        await cart.updateCartItem('p1', 1);
        await flushPromises();

        expect(updateCartItemByProductId).toHaveBeenCalledTimes(1);
        expect(cart.lineWarnings.p1).toBeUndefined();
        expect(wrapper.findAll('[data-test=cart-line-warning]')).toHaveLength(1);
    });
});
