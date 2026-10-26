/**
 * @module
 * Mounts the real panel and spies on the store's own write, the same pattern
 * `record-offline-payment-form.spec.ts` uses. Scoped to what the panel itself renders — the PSP
 * sequence is proven at the store level already.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PaymentPanel from '../components/PaymentPanel.vue';
import { usePaymentsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import type { Payment, PaymentMethodOption } from '@types';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aPayment } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * Mounts the panel with a stubbed payment fetch; `props` override the defaults. The deployment
 * offers `card` unless `offered` says otherwise (`[]` is a deployment with no card provider).
 */
const mountPanel = (
    props: Record<string, unknown> = {},
    offered: PaymentMethodOption[] = [{ id: 'card' }]
) => {
    const store = usePaymentsStore();
    store.methods = offered;
    vi.spyOn(store, 'fetchPaymentForOrder').mockResolvedValue(undefined);
    vi.spyOn(store, 'fetchMethods').mockResolvedValue(offered);

    return {
        store,
        wrapper: mount(PaymentPanel, {
            props: { orderId: 'order-1', orderPayable: true, ...props },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

/** A hand-paid, settled payment: the fixture the refund lines need. */
const handPaidSucceededPayment: Payment = aPayment({
    id: 'payment-1',
    orderId: 'order-1',
    amount: 100,
    provider: 'manual',
    method: 'bank_transfer'
});

/** A pending refund record on `handPaidSucceededPayment`, owed by hand. */
const pendingRefund: Payment['refunds'][number] = {
    id: 'refund-1',
    amount: 100,
    currency: 'EUR',
    status: 'pending',
    reason: 'cancellation',
    createdAt: '2026-03-05T10:00:00Z'
};

/** A hand-paid payment with one refund waiting for an operator to confirm it. */
const waitingRefund = () => ({
    ...handPaidSucceededPayment,
    displayStatus: 'refund_pending' as const,
    amountRefunded: 100,
    refunds: [pendingRefund]
});

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
     * `card` is listed only once the backend has a card provider, so a deployment with none (a
     * production one, today) must not show a card form — and no test cards either.
     */
    describe('when the deployment offers no card', () => {
        it('shows no card form and says so', () => {
            const { wrapper } = mountPanel({}, []);

            expect(wrapper.find('[data-test=payment-submit]').exists()).toBe(false);
            expect(wrapper.find('[data-test=payment-method-select]').exists()).toBe(false);
            expect(wrapper.find('[data-test=payment-card-unavailable]').exists()).toBe(true);
        });

        it('shows no card form when only bank transfer is offered either', () => {
            const { wrapper } = mountPanel({}, [{ id: 'bank_transfer', holdHours: 168 }]);

            expect(wrapper.find('[data-test=payment-submit]').exists()).toBe(false);
        });

        it('asks the backend for the methods when none are known yet', () => {
            const { store } = mountPanel({}, []);

            expect(store.fetchMethods).toHaveBeenCalledTimes(1);
        });
    });

    it('does not ask again for methods the cart already loaded', () => {
        const { store } = mountPanel();

        expect(store.fetchMethods).not.toHaveBeenCalled();
    });

    it('offers the test cards in a development build, once the picker has loaded', () => {
        const { wrapper } = mountPanel();

        // The picker is a lazy chunk, so it arrives a few ticks after the panel renders.
        return vi.waitFor(() => {
            expect(wrapper.find('[data-test=payment-method-select]').exists()).toBe(true);
        });
    });

    /**
     * Every order that holds stock freezes a real `payBy`, card orders included — the
     * deadline has to show wherever the order is still payable, not only in
     * `TransferInstructionsPanel`, which a card order never mounts (no `transferInstructions`).
     */
    describe('the payment deadline', () => {
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

            return nextRenderTick(wrapper).then(() => {
                expect(wrapper.find('[data-test=payment-deadline]').exists()).toBe(false);
            });
        });
    });

    /*
     * Cancelling, a withdrawal or a received return leaves hand-paid money `succeeded` with a
     * pending refund until an operator confirms it came back. The line is the SERVER's
     * `displayStatus`, never a guess from the order's status.
     */
    describe('a hand-paid payment with a refund waiting', () => {
        it('says an operator has to confirm the money went back', () => {
            const { store, wrapper } = mountPanel();
            store.payment = waitingRefund();

            return nextRenderTick(wrapper).then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(true);
                expect(wrapper.find('[data-test=payment-refunded-by-hand]').exists()).toBe(false);
            });
        });

        it('shows the waiting refund before a refund an operator already confirmed', () => {
            const { store, wrapper } = mountPanel();
            store.payment = {
                ...waitingRefund(),
                refunds: [
                    pendingRefund,
                    { ...pendingRefund, id: 'refund-2', status: 'succeeded', settledByHand: true }
                ]
            };

            return nextRenderTick(wrapper).then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(true);
                expect(wrapper.find('[data-test=payment-refunded-by-hand]').exists()).toBe(false);
            });
        });

        it('says the money was returned by hand once nothing is waiting, partial or whole', () => {
            const { store, wrapper } = mountPanel();
            store.payment = {
                ...handPaidSucceededPayment,
                displayStatus: 'partially_refunded',
                amountRefunded: 30,
                refunds: [{ ...pendingRefund, status: 'succeeded', settledByHand: true }]
            };

            return nextRenderTick(wrapper).then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(false);
                expect(wrapper.find('[data-test=payment-refunded-by-hand]').exists()).toBe(true);
            });
        });

        it('says nothing about a refund when the order was cancelled but no refund is open', () => {
            const { store, wrapper } = mountPanel();
            store.payment = { ...handPaidSucceededPayment };

            return nextRenderTick(wrapper).then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(false);
            });
        });

        it('explains a card refund the provider has not confirmed, without asking an operator', () => {
            const { store, wrapper } = mountPanel();
            store.payment = {
                ...waitingRefund(),
                provider: 'fake',
                method: 'card',
                refunds: [{ ...pendingRefund, status: 'failed' }]
            };

            return nextRenderTick(wrapper).then(() => {
                expect(wrapper.find('[data-test=payment-refund-pending]').exists()).toBe(false);
                expect(wrapper.find('[data-test=payment-card-refund-pending]').exists()).toBe(true);
            });
        });
    });

    describe('the paid-by line', () => {
        it('shows only for money that arrived', () => {
            const { store, wrapper } = mountPanel();
            store.payment = { ...handPaidSucceededPayment, method: 'cash' };

            return nextRenderTick(wrapper)
                .then(() => {
                    expect(wrapper.find('[data-test=payment-offline-detail]').exists()).toBe(true);
                    store.payment = {
                        ...handPaidSucceededPayment,
                        method: 'cash',
                        status: 'cancelled',
                        displayStatus: 'cancelled'
                    };
                    return nextRenderTick(wrapper);
                })
                .then(() => {
                    expect(wrapper.find('[data-test=payment-offline-detail]').exists()).toBe(false);
                });
        });
    });

    /**
     * The store's `payment` ref is shared across every order this panel instance is ever
     * given — `Order.vue` reuses the same instance across orders (`watchOrder`, no remount on a
     * route param change alone) — so it must both re-fetch on a new `orderId` and refuse to render
     * a record left over from the order it just moved on from.
     */
    describe('re-checking the record belongs to this order', () => {
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

            return nextRenderTick(wrapper)
                .then(() => {
                    expect(wrapper.find('[data-test=payment-status]').exists()).toBe(true);
                    // fetchPaymentForOrder is stubbed to resolve without touching store.payment,
                    // so order-1's record is still the only thing in the store — a stand-in for a
                    // slow response landing after the caller has already moved on.
                    return wrapper.setProps({ orderId: 'order-2' });
                })
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(wrapper.find('[data-test=payment-status]').exists()).toBe(false);
                });
        });
    });
});

describe('a partially refunded payment', () => {
    it('says how much of the payment went back', () => {
        const { store, wrapper } = mountPanel();
        store.payment = {
            ...handPaidSucceededPayment,
            displayStatus: 'partially_refunded',
            amountRefunded: 25
        };

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.get('[data-test=payment-partially-refunded]').text()).toMatch(/25.*100/);
        });
    });

    // The amount counts open refunds too, so only the server's label says money actually went back.
    it('does not claim a refund that is only waiting', () => {
        const { store, wrapper } = mountPanel();
        store.payment = {
            ...handPaidSucceededPayment,
            displayStatus: 'refund_pending',
            amountRefunded: 100,
            refunds: [pendingRefund]
        };

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.find('[data-test=payment-partially-refunded]').exists()).toBe(false);
        });
    });

    it('says nothing when nothing went back, or when all of it did', () => {
        const { store, wrapper } = mountPanel();
        store.payment = { ...handPaidSucceededPayment };

        return nextRenderTick(wrapper)
            .then(() => {
                expect(wrapper.find('[data-test=payment-partially-refunded]').exists()).toBe(false);
                store.payment = {
                    ...handPaidSucceededPayment,
                    displayStatus: 'refunded',
                    amountRefunded: 100
                };
                return nextRenderTick(wrapper);
            })
            .then(() => {
                expect(wrapper.find('[data-test=payment-partially-refunded]').exists()).toBe(false);
            });
    });
});

describe('the status chip', () => {
    it.each([
        ['succeeded', 'Succeeded'],
        ['refunded', 'Refunded'],
        ['cancelled', 'Cancelled']
    ] as const)('reads displayStatus %s as %s, never the stored status', (displayStatus, text) => {
        const { store, wrapper } = mountPanel();
        store.payment = { ...handPaidSucceededPayment, displayStatus };

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.get('[data-test=payment-status]').text()).toBe(text);
        });
    });
});

describe('PaymentPanel — a waiting bank transfer', () => {
    const waiting: Payment = {
        ...handPaidSucceededPayment,
        status: 'requires_action',
        displayStatus: 'pending',
        nextAction: {
            type: 'bank_transfer',
            beneficiary: 'Guebbit Shop',
            iban: 'IT60 X054 2811 1010 0000 0123 456',
            reference: 'RF132EY8H44VJAVZKX80JRL',
            payBy: '2026-01-01T00:00:00.000Z'
        },
        actions: { pay: true, sync: false, refund: false, settleByHand: [], cancelRefund: [] }
    };

    it('shows the instructions, offers no "finish at your bank" step, and keeps the card form when payable', () => {
        const { wrapper, store } = mountPanel();
        store.payment = waiting;

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.find('[data-test=transfer-instructions-panel]').exists()).toBe(true);
            expect(wrapper.find('[data-test=payment-finish]').exists()).toBe(false);
            expect(wrapper.find('[data-test=payment-submit]').exists()).toBe(true);
        });
    });

    it('shows staff the instructions and no card form or finish button', () => {
        const { wrapper, store } = mountPanel({ orderPayable: false });
        store.payment = {
            ...waiting,
            actions: { pay: false, sync: false, refund: false, settleByHand: [], cancelRefund: [] }
        };

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.find('[data-test=transfer-instructions-panel]').exists()).toBe(true);
            expect(wrapper.find('[data-test=payment-finish]').exists()).toBe(false);
            expect(wrapper.find('[data-test=payment-submit]').exists()).toBe(false);
        });
    });
});

describe('PaymentPanel — finishing at the provider', () => {
    const inFlight: Payment = aPayment({
        id: 'payment-2',
        orderId: 'order-1',
        status: 'requires_action',
        displayStatus: 'incomplete',
        actions: { pay: false, sync: true, refund: false, settleByHand: [], cancelRefund: [] }
    });

    it('offers the finish button when the server says sync would work', () => {
        const { store, wrapper } = mountPanel({ orderPayable: false });
        store.payment = inFlight;

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.find('[data-test=payment-finish]').exists()).toBe(true);
        });
    });

    it('hides it from a reader the server does not offer it to (staff, a transfer)', () => {
        const { store, wrapper } = mountPanel({ orderPayable: false });
        store.payment = {
            ...inFlight,
            actions: { pay: false, sync: false, refund: false, settleByHand: [], cancelRefund: [] }
        };

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.find('[data-test=payment-status]').exists()).toBe(true);
            expect(wrapper.find('[data-test=payment-finish]').exists()).toBe(false);
        });
    });

    it('hands the order to the store, so a decline can re-read the payment', () => {
        const { store, wrapper } = mountPanel({ orderPayable: false });
        const finish = vi.spyOn(store, 'finishAtProvider').mockResolvedValue(inFlight);
        store.payment = inFlight;

        return nextRenderTick(wrapper)
            .then(() => wrapper.get('[data-test=payment-finish]').trigger('click'))
            .then(() => {
                expect(finish).toHaveBeenCalledWith('payment-2', 'order-1');
            });
    });
});
