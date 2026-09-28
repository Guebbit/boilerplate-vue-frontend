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
import type { Payment } from '@types';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

const mountPanel = (props: Record<string, unknown> = {}) => {
    const store = usePaymentsStore();
    vi.spyOn(store, 'fetchPaymentForOrder').mockResolvedValue(undefined);

    return {
        store,
        wrapper: mount(PaymentPanel, {
            props: { orderId: 'order-1', orderPayable: true, ...props },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

/** A hand-paid, settled payment — the fixture B1b's "refund pending" label needs. */
const handPaidSucceededPayment: Payment = {
    id: 'payment-1',
    orderId: 'order-1',
    amount: 100,
    currency: 'EUR',
    status: 'succeeded',
    provider: 'manual',
    method: 'bank_transfer'
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
     * FA32c: every order that holds stock now freezes a real `payBy`, card orders included — the
     * deadline has to show wherever the order is still payable, not only in
     * `TransferInstructionsPanel`, which a card order never mounts (no `transferInstructions`).
     */
    describe('the payment deadline (FA32c)', () => {
        it('shows it while the order is payable and a payBy is given', () => {
            const { wrapper } = mountPanel({ payBy: '2026-01-10T12:00:00.000Z' });
            expect(wrapper.find('[data-test=payment-deadline]').exists()).toBe(true);
        });

        it('shows nothing when no payBy is given — an order that predates the field', () => {
            const { wrapper } = mountPanel();
            expect(wrapper.find('[data-test=payment-deadline]').exists()).toBe(false);
        });

        it('shows nothing once the order is no longer payable', () => {
            const { store, wrapper } = mountPanel({
                orderPayable: false,
                payBy: '2026-01-10T12:00:00.000Z'
            });
            store.payment = { ...handPaidSucceededPayment };

            return wrapper.vm.$nextTick().then(() => {
                expect(wrapper.find('[data-test=payment-deadline]').exists()).toBe(false);
            });
        });
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

    /*
     * B1b: cancelling a hand-paid order no longer auto-marks it refunded — it stays `succeeded`
     * until an operator confirms the money actually came back. The panel must say why a "paid"
     * payment sits on a cancelled order, rather than showing a plain, misleading "Paid".
     */
    describe('a hand-paid payment on a cancelled order', () => {
        it('shows the refund-pending label', () => {
            const { store, wrapper } = mountPanel({ orderStatus: 'cancelled' });
            store.payment = { ...handPaidSucceededPayment };

            return wrapper.vm.$nextTick().then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(true);
                expect(wrapper.find('[data-test=payment-refunded-by-hand]').exists()).toBe(false);
            });
        });

        it('does not show the label once an operator has confirmed the refund', () => {
            const { store, wrapper } = mountPanel({ orderStatus: 'cancelled' });
            store.payment = {
                ...handPaidSucceededPayment,
                status: 'refunded',
                refundedByHand: true
            };

            return wrapper.vm.$nextTick().then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(false);
                expect(wrapper.find('[data-test=payment-refunded-by-hand]').exists()).toBe(true);
            });
        });

        it('does not show the label for a card payment — B1b is the hand-paid case only', () => {
            const { store, wrapper } = mountPanel({ orderStatus: 'cancelled' });
            store.payment = { ...handPaidSucceededPayment, provider: 'fake', method: 'card' };

            return wrapper.vm.$nextTick().then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(false);
            });
        });

        it('does not show the label while the order is still active', () => {
            const { store, wrapper } = mountPanel({ orderStatus: 'paid' });
            store.payment = { ...handPaidSucceededPayment };

            return wrapper.vm.$nextTick().then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(false);
            });
        });
    });

    /**
     * FA24: the store's `payment` ref is shared across every order this panel instance is ever
     * given — `Order.vue` reuses the same instance across orders (`watchOrder`, no remount on a
     * route param change alone) — so it must both re-fetch on a new `orderId` and refuse to render
     * a record left over from the order it just moved on from.
     */
    describe('re-checking the record belongs to this order (FA24)', () => {
        it('re-fetches when orderId changes without a remount', () => {
            const { store, wrapper } = mountPanel();
            expect(store.fetchPaymentForOrder).toHaveBeenCalledWith('order-1');

            return wrapper.setProps({ orderId: 'order-2' }).then(() => {
                expect(store.fetchPaymentForOrder).toHaveBeenCalledWith('order-2');
            });
        });

        it('stops showing a payment once orderId moves on, even before the new fetch resolves', () => {
            const { store, wrapper } = mountPanel();
            store.payment = { ...handPaidSucceededPayment };

            return wrapper.vm
                .$nextTick()
                .then(() => {
                    expect(wrapper.find('[data-test=payment-status]').exists()).toBe(true);
                    // fetchPaymentForOrder is stubbed to resolve without touching store.payment,
                    // so order-1's record is still the only thing in the store — a stand-in for a
                    // slow response landing after the caller has already moved on.
                    return wrapper.setProps({ orderId: 'order-2' });
                })
                .then(() => wrapper.vm.$nextTick())
                .then(() => {
                    expect(wrapper.find('[data-test=payment-status]').exists()).toBe(false);
                });
        });
    });
});
