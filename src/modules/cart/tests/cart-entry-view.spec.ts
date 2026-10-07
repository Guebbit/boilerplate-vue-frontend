/**
 * @module
 * The cart route's one decision: a guest gets the guest cart, a signed-in visitor the real one.
 * Both screens are stubbed, since each has its own spec; what is under test is which one shows.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import CartEntry from '../views/CartEntry.vue';
import { useSessionStore } from '@/infrastructure/session.ts';

vi.mock('../views/Cart.vue', () => ({
    default: { template: '<div data-test="signed-in-cart" />' }
}));

vi.mock('../components/GuestCart.vue', () => ({
    default: { template: '<div data-test="guest-cart-stub" />' }
}));

/**
 * Signs a visitor in: `isAuth` needs both the token and who it belongs to.
 */
const signIn = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'u1@example.com', role: 'customer' };
};

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('the cart route', () => {
    it('shows a guest the guest cart', () => {
        const wrapper = mount(CartEntry);

        expect(wrapper.find('[data-test=guest-cart-stub]').exists()).toBe(true);
        expect(wrapper.find('[data-test=signed-in-cart]').exists()).toBe(false);
    });

    it('shows a signed-in visitor the real cart', () => {
        signIn();

        const wrapper = mount(CartEntry);

        expect(wrapper.find('[data-test=signed-in-cart]').exists()).toBe(true);
        expect(wrapper.find('[data-test=guest-cart-stub]').exists()).toBe(false);
    });

    it('swaps the screen when the guest signs in', async () => {
        const wrapper = mount(CartEntry);

        signIn();
        await nextTick();

        expect(wrapper.find('[data-test=signed-in-cart]').exists()).toBe(true);
    });
});
