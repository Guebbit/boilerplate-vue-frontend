/**
 * @module
 * The "Notify me" button, as the stock-alerts module contributes it to the `product-actions` slot:
 * absent for a guest and for a product that can be ordered, a toggle that asks or cancels otherwise.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import NotifyMeButton from '../components/NotifyMeButton.vue';
import { useStockAlertsStore } from '../store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Product } from '@types';

wireModulesIntoCore();

/**
 * A product, sold out unless the test says otherwise.
 *
 * @param overrides - The flags a case bends.
 */
const aProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 'p1',
    title: 'Widget',
    price: 1,
    currency: 'EUR',
    inStock: false,
    lowStock: false,
    ...overrides
});

/**
 * Signs a visitor in, since the button only exists for one.
 */
const signIn = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'shopper@example.com', role: 'customer' };
};

/**
 * Mounts the button with the store already holding `asked` product ids.
 *
 * @param product - The product the button belongs to.
 * @param asked - Ids with an open request.
 */
const mountButton = (product: Product, asked: string[] = []) => {
    const alerts = useStockAlertsStore();
    alerts.items = asked.map((productId) => ({ productId, createdAt: '2026-10-18T00:00:00Z' }));
    // Decoration on the page, not under test — no transport to answer a real fetch here.
    vi.spyOn(alerts, 'ensureStockAlerts').mockResolvedValue(alerts.items);
    return {
        alerts,
        wrapper: mount(NotifyMeButton, {
            props: { product },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the notify-me button', () => {
    it('renders nothing for a guest', () => {
        expect(mountButton(aProduct()).wrapper.find('[data-test=notify-me]').exists()).toBe(false);
    });

    it.each([
        ['in stock', { inStock: true }],
        ['a preorder with allowance', { inStock: true, preorder: true }],
        ['a backorder', { inStock: false, backorder: true }]
    ])('is not offered for a product that can be ordered: %s', (_label, flags) => {
        signIn();

        expect(mountButton(aProduct(flags)).wrapper.find('[data-test=notify-me]').exists()).toBe(
            false
        );
    });

    it.each([
        ['sold out', {}],
        ['off sale', { purchasable: false, inStock: true }]
    ])('is offered for a product that cannot be ordered: %s', (_label, flags) => {
        signIn();

        expect(mountButton(aProduct(flags)).wrapper.find('[data-test=notify-me]').exists()).toBe(
            true
        );
    });

    it('asks to be told, and then reads "You\'ll be told"', async () => {
        signIn();
        const { alerts, wrapper } = mountButton(aProduct());
        const ask = vi.spyOn(alerts, 'ask').mockImplementation(() => {
            alerts.items = [{ productId: 'p1', createdAt: '2026-10-18T00:00:00Z' }];
            return Promise.resolve(alerts.items);
        });

        await wrapper.get('[data-test=notify-me]').trigger('click');

        expect(ask).toHaveBeenCalledWith('p1');
        expect(wrapper.get('[data-test=notify-me]').text()).toBe("You'll be told");
    });

    it('cancels a request already open, even if the product can be ordered by now', async () => {
        signIn();
        const { alerts, wrapper } = mountButton(aProduct({ inStock: true }), ['p1']);
        const cancel = vi.spyOn(alerts, 'cancel').mockResolvedValue([]);

        await wrapper.get('[data-test=notify-me]').trigger('click');

        expect(cancel).toHaveBeenCalledWith('p1');
    });

    it('blocks the button in place when the write fails', async () => {
        signIn();
        const { alerts, wrapper } = mountButton(aProduct());
        vi.spyOn(alerts, 'ask').mockRejectedValue(new Error('network down'));

        await wrapper.get('[data-test=notify-me]').trigger('click');
        await flushPromises();

        expect(wrapper.find('[data-test=notify-me-error]').exists()).toBe(true);
    });
});
