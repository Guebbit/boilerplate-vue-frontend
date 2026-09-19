/**
 * @module
 * Mounts the real panel and spies on the store's own write, the same pattern
 * `record-offline-payment-form.spec.ts` uses. Scoped to the payment-start refusal this panel
 * classifies itself (`ORDER_PRODUCT_UNAVAILABLE`) — the PSP sequence is proven at the store level
 * already.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PaymentPanel from '@/modules/payments/components/PaymentPanel.vue';
import { usePaymentsStore } from '@/modules/payments/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

const mountPanel = () => {
    const store = usePaymentsStore();
    vi.spyOn(store, 'fetchPaymentForOrder').mockResolvedValue(undefined);

    return {
        store,
        wrapper: mount(PaymentPanel, {
            props: { orderId: 'order-1', orderPayable: true },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('PaymentPanel', () => {
    it('shows the form while the order is payable', () => {
        const { wrapper } = mountPanel();
        expect(wrapper.find('[data-test=payment-submit]').exists()).toBe(true);
    });

    /**
     * The refusal this component classifies itself, unlike every other one it hands to the
     * generic toast — a product removed or deactivated since the order was placed, caught fresh
     * at payment start rather than trusting the order's own frozen line snapshot.
     */
    it('names the unavailable products on ORDER_PRODUCT_UNAVAILABLE, keeping the form open', () => {
        const { store, wrapper } = mountPanel();
        vi.spyOn(store, 'payForOrder').mockRejectedValue({
            success: false,
            status: 409,
            message: 'x',
            errors: [
                {
                    code: 'ORDER_PRODUCT_UNAVAILABLE',
                    message: 'x',
                    details: { lines: [{ productId: 'p1', title: 'Widget' }] }
                }
            ]
        });

        return wrapper
            .get('form')
            .trigger('submit')
            .then(() => wrapper.vm.$nextTick())
            .then(() => wrapper.vm.$nextTick())
            .then(() => {
                const lines = wrapper.findAll('[data-test=payment-unavailable-line]');
                expect(lines).toHaveLength(1);
                expect(lines[0]?.text()).toBe('Widget');
                // The retry door stays open — refusing to pay is not the same as nothing to pay.
                expect(wrapper.find('[data-test=payment-submit]').exists()).toBe(true);
            });
    });

    it('does not carry a stale unavailable-lines banner into the next, unrelated refusal', () => {
        const { store, wrapper } = mountPanel();
        vi.spyOn(store, 'payForOrder')
            .mockRejectedValueOnce({
                success: false,
                status: 409,
                message: 'x',
                errors: [
                    {
                        code: 'ORDER_PRODUCT_UNAVAILABLE',
                        message: 'x',
                        details: { lines: [{ productId: 'p1', title: 'Widget' }] }
                    }
                ]
            })
            .mockRejectedValueOnce({
                success: false,
                status: 409,
                message: 'x',
                errors: [{ code: 'PAYMENT_ORDER_NOT_PAYABLE', message: 'x' }]
            });

        return wrapper
            .get('form')
            .trigger('submit')
            .then(() => wrapper.vm.$nextTick())
            .then(() => wrapper.vm.$nextTick())
            .then(() => {
                expect(wrapper.findAll('[data-test=payment-unavailable-line]')).toHaveLength(1);
                return wrapper.get('form').trigger('submit');
            })
            .then(() => wrapper.vm.$nextTick())
            .then(() => wrapper.vm.$nextTick())
            .then(() => {
                expect(wrapper.findAll('[data-test=payment-unavailable-line]')).toHaveLength(0);
            });
    });
});
