/**
 * @module
 * The product page's heart, as the wishlist module contributes it to the `product-actions` slot:
 * absent for a guest, and a toggle that saves or unsaves depending on what the list holds.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import WishlistToggle from '@/modules/wishlist/components/WishlistToggle.vue';
import { useWishlistStore } from '@/modules/wishlist/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Product } from '@types';

wireModulesIntoCore();

/**
 * The product the heart belongs to.
 */
const PRODUCT: Product = { id: 'p1', title: 'Widget', price: 1, currency: 'EUR' };

/**
 * Signs a visitor in, since the heart only exists for one.
 */
const signIn = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'shopper@example.com', role: 'customer' };
};

/**
 * Mounts the heart with the wishlist already holding `saved` product ids.
 *
 * @param saved - Ids on the list.
 */
const mountToggle = (saved: string[]) => {
    const wishlist = useWishlistStore();
    wishlist.items = saved.map((productId) => ({ productId }));
    // Decoration on the page, not under test — no transport to answer a real fetch here.
    vi.spyOn(wishlist, 'fetchWishlist').mockResolvedValue(wishlist.items);
    return {
        wishlist,
        wrapper: mount(WishlistToggle, {
            props: { product: PRODUCT },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the wishlist heart', () => {
    it('renders nothing for a guest', () => {
        expect(mountToggle([]).wrapper.find('[data-test=wishlist-toggle]').exists()).toBe(false);
    });

    it('saves a product that is not on the list yet', async () => {
        signIn();
        const { wishlist, wrapper } = mountToggle([]);
        const add = vi.spyOn(wishlist, 'addToWishlist').mockResolvedValue([]);

        await wrapper.get('[data-test=wishlist-toggle]').trigger('click');

        expect(add).toHaveBeenCalledWith('p1');
    });

    it('unsaves a product already on the list', async () => {
        signIn();
        const { wishlist, wrapper } = mountToggle(['p1']);
        const remove = vi.spyOn(wishlist, 'removeFromWishlist').mockResolvedValue([]);

        await wrapper.get('[data-test=wishlist-toggle]').trigger('click');

        expect(remove).toHaveBeenCalledWith('p1');
        expect(wrapper.get('[data-test=wishlist-toggle]').text()).toBe('Saved');
    });

    it('blocks the button in place when the write fails', async () => {
        signIn();
        const { wishlist, wrapper } = mountToggle([]);
        vi.spyOn(wishlist, 'addToWishlist').mockRejectedValue(new Error('network down'));

        await wrapper.get('[data-test=wishlist-toggle]').trigger('click');
        await flushPromises();

        expect(wrapper.find('[data-test=wishlist-toggle-error]').exists()).toBe(true);
    });
});
