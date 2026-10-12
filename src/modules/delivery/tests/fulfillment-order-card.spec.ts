/**
 * @module
 * `FulfillmentOrderCard.vue` — one card per fulfillment order. Mounts the real card with the
 * store's writes spied. Covered: what each status shows, that every staff button comes from the
 * record's own `actions` (plus the one forced-ship exception), and that a move is reported to
 * the page. The dialogs' own forms are `ship-items-dialog.spec.ts`'s.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FulfillmentOrderCard from '../components/FulfillmentOrderCard.vue';
import { useDeliveryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { OrderStatus } from '@/types/enums.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aFulfillmentOrder, aShipment } from '../../../../tests/support/unit/fixtures.ts';
import type { FulfillmentOrder, Shipment } from '@types';

wireModulesIntoCore();

/**
 * Mounts the card, with `v-dialog` stubbed to render its content inline.
 *
 * @param fulfillmentOrder - The record under test.
 * @param extra - Shipments and the order's `override`.
 * @returns The wrapper and the store.
 */
const mountCard = (
    fulfillmentOrder: FulfillmentOrder,
    extra: { shipments?: Shipment[]; override?: OrderStatus[] } = {}
) => {
    const store = useDeliveryStore();
    const wrapper = mount(FulfillmentOrderCard, {
        props: { shipments: [], ...extra, fulfillmentOrder },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, store };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('what a card shows', () => {
    it.each([
        ['open', 'Not shipped yet'],
        ['in_progress', 'Partly shipped'],
        ['on_hold', 'On hold'],
        ['closed', 'Fulfilled'],
        ['cancelled', 'Cancelled']
    ] as const)('labels a %s fulfillment order in words', (status, text) => {
        const { wrapper } = mountCard(aFulfillmentOrder({ status }));

        expect(wrapper.get('[data-test=fulfillment-order-status]').text()).toBe(text);
    });

    it('says an awaiting-stock hold waits for stock, and offers no release', () => {
        const { wrapper } = mountCard(
            aFulfillmentOrder({
                status: 'on_hold',
                holdReason: 'awaiting_stock',
                actions: {
                    ship: false,
                    fulfill: false,
                    hold: false,
                    release: false,
                    confirmWait: false
                }
            })
        );

        expect(wrapper.get('[data-test=fulfillment-order-awaiting-stock]').text()).toContain(
            'Waits for stock'
        );
        expect(wrapper.find('[data-test=release]').exists()).toBe(false);
    });

    it('shows the staff note and the revised date over the agreed one', () => {
        const { wrapper } = mountCard(
            aFulfillmentOrder({
                status: 'on_hold',
                holdReason: 'incorrect_address',
                holdNote: 'call the buyer',
                agreedAt: '2026-12-01T00:00:00.000Z',
                expectedAt: '2026-12-12T00:00:00.000Z'
            })
        );

        expect(wrapper.get('[data-test=fulfillment-order-note]').text()).toContain(
            'call the buyer'
        );
        expect(wrapper.get('[data-test=fulfillment-order-expected]').text()).toContain('12');
        expect(wrapper.get('[data-test=fulfillment-order-hold-reason]').text()).toBe(
            'Incorrect address'
        );
    });

    it('shows each line as shipped of quantity, with the cancelled count when there is one', () => {
        const { wrapper } = mountCard(
            aFulfillmentOrder({
                lines: [
                    {
                        productId: 'p1',
                        title: 'Shirt',
                        quantity: 3,
                        shippedQuantity: 1,
                        cancelledQuantity: 1,
                        remaining: 1
                    }
                ]
            })
        );

        expect(wrapper.get('[data-test=fulfillment-order-lines]').text()).toContain(
            '1 of 3 shipped'
        );
        expect(wrapper.get('[data-test=fulfillment-order-lines]').text()).toContain('1 cancelled');
    });

    it('marks a digital group', () => {
        expect(
            mountCard(aFulfillmentOrder({ kind: 'digital' }))
                .wrapper.find('[data-test=fulfillment-order-digital]')
                .exists()
        ).toBe(true);
    });

    it('lists its shipments', () => {
        const { wrapper } = mountCard(aFulfillmentOrder(), {
            shipments: [aShipment({ id: 's1' }), aShipment({ id: 's2', number: 2 })]
        });

        expect(wrapper.findAll('[data-test=shipment-row]')).toHaveLength(2);
    });
});

describe('the buttons come from `actions`', () => {
    it('offers none when no action is on', () => {
        const { wrapper } = mountCard(aFulfillmentOrder());

        for (const name of ['open-ship', 'mark-fulfilled', 'open-hold', 'release'])
            expect(wrapper.find(`[data-test=${name}]`).exists()).toBe(false);
    });

    it('offers ship and hold on an open one', () => {
        const { wrapper } = mountCard(
            aFulfillmentOrder({
                actions: {
                    ship: true,
                    fulfill: false,
                    hold: true,
                    release: false,
                    confirmWait: false
                }
            })
        );

        expect(wrapper.find('[data-test=open-ship]').exists()).toBe(true);
        expect(wrapper.find('[data-test=open-hold]').exists()).toBe(true);
    });

    it('offers the forced ship to an override holder while the ordinary door is closed', () => {
        const { wrapper } = mountCard(aFulfillmentOrder(), { override: [OrderStatus.shipped] });

        expect(wrapper.find('[data-test=open-ship]').exists()).toBe(true);
    });

    it('never offers the forced ship on a held or finished group, nor a digital one', () => {
        for (const order of [
            aFulfillmentOrder({ status: 'on_hold' }),
            aFulfillmentOrder({ status: 'closed' }),
            aFulfillmentOrder({ kind: 'digital' })
        ])
            expect(
                mountCard(order, { override: [OrderStatus.shipped] })
                    .wrapper.find('[data-test=open-ship]')
                    .exists()
            ).toBe(false);
    });

    it('fulfils a digital group and tells the page', () => {
        const { wrapper, store } = mountCard(
            aFulfillmentOrder({
                kind: 'digital',
                actions: {
                    ship: false,
                    fulfill: true,
                    hold: false,
                    release: false,
                    confirmWait: false
                }
            })
        );
        const fulfill = vi.spyOn(store, 'fulfill').mockResolvedValue(aShipment());

        return wrapper
            .get('[data-test=mark-fulfilled]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(fulfill).toHaveBeenCalledWith('fo1');
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    it('releases a staff hold and tells the page', () => {
        const { wrapper, store } = mountCard(
            aFulfillmentOrder({
                status: 'on_hold',
                holdReason: 'other',
                actions: {
                    ship: false,
                    fulfill: false,
                    hold: false,
                    release: true,
                    confirmWait: false
                }
            })
        );
        const release = vi.spyOn(store, 'release').mockResolvedValue(aFulfillmentOrder());

        return wrapper
            .get('[data-test=release]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(release).toHaveBeenCalledWith('fo1');
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    it('shows a refusal in place and does not tell the page', () => {
        const { wrapper, store } = mountCard(
            aFulfillmentOrder({
                kind: 'digital',
                actions: {
                    ship: false,
                    fulfill: true,
                    hold: false,
                    release: false,
                    confirmWait: false
                }
            })
        );
        vi.spyOn(store, 'fulfill').mockRejectedValue(new Error('not digital'));

        return wrapper
            .get('[data-test=mark-fulfilled]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(wrapper.get('[data-test=fulfillment-order-error]').text()).toContain(
                    'not digital'
                );
                expect(wrapper.emitted('moved')).toBeUndefined();
            });
    });
});

describe('a late preorder', () => {
    it("asks the buyer, with the deadline, and sends the answer through the record's own action", () => {
        const { wrapper, store } = mountCard(
            aFulfillmentOrder({
                status: 'on_hold',
                holdReason: 'awaiting_stock',
                agreedAt: '2027-03-01T00:00:00.000Z',
                expectedAt: '2027-03-20T00:00:00.000Z',
                consent: 'awaiting',
                consentDeadline: '2027-04-19T00:00:00.000Z',
                actions: {
                    ship: false,
                    fulfill: false,
                    hold: false,
                    release: false,
                    confirmWait: true
                }
            })
        );
        const confirm = vi.spyOn(store, 'confirmWait').mockResolvedValue(aFulfillmentOrder());

        expect(wrapper.get('[data-test=fulfillment-order-consent]').text()).toContain(
            'Do you still want to wait'
        );
        expect(wrapper.get('[data-test=fulfillment-order-answer-by]').text()).toContain(
            'Answer by'
        );
        expect(wrapper.get('[data-test=fulfillment-order-promised]').text()).toContain('Promised');

        return wrapper
            .get('[data-test=confirm-wait]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(confirm).toHaveBeenCalledWith('fo1');
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    it('tells staff the answer is awaited, and offers no button', () => {
        const { wrapper } = mountCard(
            aFulfillmentOrder({
                status: 'on_hold',
                consent: 'awaiting',
                consentDeadline: '2027-04-19T00:00:00.000Z'
            })
        );

        expect(wrapper.get('[data-test=fulfillment-order-consent]').text()).toContain(
            'Waiting for the buyer'
        );
        expect(wrapper.find('[data-test=confirm-wait]').exists()).toBe(false);
    });

    it.each([
        ['confirmed', 'Keep waiting confirmed'],
        ['expired', 'No answer in time']
    ] as const)('reads a %s consent in words, with no deadline left to show', (consent, words) => {
        const { wrapper } = mountCard(aFulfillmentOrder({ consent }));

        expect(wrapper.get('[data-test=fulfillment-order-consent]').text()).toContain(words);
        expect(wrapper.find('[data-test=fulfillment-order-answer-by]').exists()).toBe(false);
    });

    it('says who cancelled what was left, and when the buyer was last told', () => {
        const { wrapper } = mountCard(
            aFulfillmentOrder({
                status: 'cancelled',
                cancelReason: 'no_answer',
                lastNoticeAt: '2027-03-02T10:00:00.000Z'
            })
        );

        expect(wrapper.get('[data-test=fulfillment-order-cancel-reason]').text()).toBe(
            'Cancelled: no answer'
        );
        expect(wrapper.get('[data-test=fulfillment-order-last-notice]').text()).toContain(
            'Last notice sent'
        );
    });

    it('shows none of it on an ordinary fulfillment order', () => {
        const { wrapper } = mountCard(aFulfillmentOrder());

        for (const hook of ['consent', 'promised', 'last-notice', 'cancel-reason'])
            expect(wrapper.find(`[data-test=fulfillment-order-${hook}]`).exists()).toBe(false);
    });
});
