/**
 * @module
 * `CancelRemainderDialog.vue` — cancelling what has not shipped, behind a confirm step that shows
 * the server's refund. Mounts the real dialog with `v-dialog` stubbed inline and the store's
 * `openReturn` spied. Covered: what each caller sends (the buyer's withdrawal, staff's note), the
 * delivery line only when this cancel takes the last unit, and a refusal staying in the dialog.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CancelRemainderDialog from '../components/CancelRemainderDialog.vue';
import { useReturnsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aReturn } from '../../../../tests/support/unit/fixtures.ts';
import type { CancellableFulfillmentOrder } from '@types';

wireModulesIntoCore();

/**
 * A remainder of one unit, refunded without delivery.
 */
const OPTION: CancellableFulfillmentOrder = {
    fulfillmentOrderId: 'fo2',
    number: 2,
    lines: [{ productId: 'p2', title: 'Mug', quantity: 1 }],
    refundAmount: 12.5,
    shippingRefund: 0
};

/**
 * Mounts the dialog open.
 *
 * @param mode - who is asking
 * @param option - the remainder on offer
 * @returns The wrapper and the spied `openReturn`.
 */
const mountDialog = (mode: 'buyer' | 'staff', option = OPTION) => {
    const openReturn = vi
        .spyOn(useReturnsStore(), 'openReturn')
        .mockResolvedValue(aReturn({ kind: 'cancellation', status: 'closed' }));
    const wrapper = mount(CancelRemainderDialog, {
        props: { modelValue: true, orderId: 'o1', currency: 'EUR', option, mode },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, openReturn };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('what the dialog shows', () => {
    it('lists the remainder and the refund the server computed', () => {
        const { wrapper } = mountDialog('buyer');

        expect(wrapper.get('[data-test=cancel-remainder-lines]').text()).toContain('1 × Mug');
        expect(wrapper.get('[data-test=cancel-remainder-refund]').text()).toContain('12.50');
        expect(wrapper.find('[data-test=cancel-remainder-shipping]').exists()).toBe(false);
    });

    it('says the delivery is inside the refund only when the server counted it', () => {
        const { wrapper } = mountDialog('buyer', {
            ...OPTION,
            refundAmount: 17.5,
            shippingRefund: 5
        });

        expect(wrapper.get('[data-test=cancel-remainder-shipping]').text()).toContain('5.00');
    });

    it('asks staff, and only staff, for a note', () => {
        expect(
            mountDialog('staff').wrapper.find('[data-test=cancel-remainder-note]').exists()
        ).toBe(true);
        expect(
            mountDialog('buyer').wrapper.find('[data-test=cancel-remainder-note]').exists()
        ).toBe(false);
    });
});

describe('what it sends', () => {
    it('the buyer’s cancellation is their withdrawal', () => {
        const { wrapper, openReturn } = mountDialog('buyer');

        return wrapper
            .get('[data-test=cancel-remainder-confirm]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(openReturn).toHaveBeenCalledWith({
                    orderId: 'o1',
                    kind: 'cancellation',
                    fulfillmentOrderId: 'fo2',
                    reason: 'withdrawal'
                });
                expect(wrapper.emitted('cancelled')).toHaveLength(1);
                expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
            });
    });

    it('staff’s cancellation has no legal reason, and carries the trimmed note', () => {
        const { wrapper, openReturn } = mountDialog('staff');

        return wrapper
            .get('[data-test=cancel-remainder-note] textarea')
            .setValue(' out of stock for good ')
            .then(() => wrapper.get('[data-test=cancel-remainder-confirm]').trigger('click'))
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(openReturn).toHaveBeenCalledWith({
                    orderId: 'o1',
                    kind: 'cancellation',
                    fulfillmentOrderId: 'fo2',
                    reason: 'other',
                    note: 'out of stock for good'
                });
            });
    });

    it('shows a refusal in place and neither closes nor tells the page', () => {
        const { wrapper, openReturn } = mountDialog('buyer');
        openReturn.mockRejectedValue(new Error('RETURN_NOTHING_TO_CANCEL'));

        return wrapper
            .get('[data-test=cancel-remainder-confirm]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(wrapper.get('[data-test=cancel-remainder-error]').text()).toContain(
                    'RETURN_NOTHING_TO_CANCEL'
                );
                expect(wrapper.emitted('cancelled')).toBeUndefined();
                expect(wrapper.emitted('update:modelValue')).toBeUndefined();
            });
    });
});
