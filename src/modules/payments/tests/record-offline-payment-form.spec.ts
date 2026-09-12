/**
 * @module
 * Mounts the real form component and spies on the store's own write, the same pattern
 * `stock-movement-form.spec.ts` uses: the field state and validation are this component's job,
 * the write itself is the store's, already proven in `store.spec.ts`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordOfflinePaymentForm from '@/modules/payments/components/RecordOfflinePaymentForm.vue';
import { usePaymentsStore } from '@/modules/payments/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * Stands in for Vuetify's `v-select`, same reasoning as `stock-movement-form.spec.ts`'s stub: a
 * real teleported overlay is unrelated to what this suite proves. `bank_transfer` is the second
 * option so a change event actually moves the model off its default (`bank_transfer` is first in
 * the generated enum — see `RecordOfflinePaymentRequestMethod` — so this stub lists it second to
 * keep the "picks something other than the default" case meaningful).
 */
const V_SELECT_STUB = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
        '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)">' +
        '<option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option></select>'
};

const mountForm = () =>
    mount(RecordOfflinePaymentForm, {
        props: { orderId: 'order-1' },
        global: { plugins: [vuetify, i18n], stubs: { VSelect: V_SELECT_STUB } }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('RecordOfflinePaymentForm', () => {
    it('records the chosen method and reference, and emits once it lands', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'recordOfflinePayment').mockResolvedValue(undefined);
        const wrapper = mountForm();

        return wrapper
            .get('[data-test=record-offline-method]')
            .setValue('bank_transfer')
            .then(() => wrapper.get('[data-test=record-offline-reference] input'))
            .then((field) => field.setValue('TRX-1'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => {
                expect(payments.recordOfflinePayment).toHaveBeenCalledWith('order-1', {
                    method: 'bank_transfer',
                    reference: 'TRX-1',
                    receivedAt: undefined
                });
                expect(wrapper.emitted('recorded')).toHaveLength(1);
            });
    });

    it('omits an empty reference rather than sending an empty string, defaulting the method', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'recordOfflinePayment').mockResolvedValue(undefined);
        const wrapper = mountForm();

        return wrapper
            .get('form')
            .trigger('submit')
            .then(() => {
                // `bank_transfer` is the first offline method in the contract's own enum order —
                // the field's default is that order's first value, not a literal chosen here.
                expect(payments.recordOfflinePayment).toHaveBeenCalledWith('order-1', {
                    method: 'bank_transfer',
                    reference: undefined,
                    receivedAt: undefined
                });
            });
    });

    it('sends a chosen date as a full ISO timestamp', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'recordOfflinePayment').mockResolvedValue(undefined);
        const wrapper = mountForm();

        return wrapper
            .get('[data-test=record-offline-received-at] input')
            .setValue('2026-01-05')
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => {
                const call = vi.mocked(payments.recordOfflinePayment).mock.calls[0]?.[1] as {
                    receivedAt?: string;
                };
                // Read back in local time, same as the component's own conversion — asserting the
                // literal UTC string would make this test depend on the runner's own timezone.
                const parsed = new Date(call.receivedAt ?? '');
                expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toEqual([
                    2026, 0, 5
                ]);
            });
    });

    it('does not emit `recorded` when the API refuses', () => {
        const payments = usePaymentsStore();
        vi.spyOn(payments, 'recordOfflinePayment').mockRejectedValue({
            success: false,
            status: 409,
            message: 'in flight',
            errors: [{ code: 'PAYMENT_IN_FLIGHT', message: 'in flight' }]
        });
        const wrapper = mountForm();

        return wrapper
            .get('form')
            .trigger('submit')
            .then(() => {
                expect(wrapper.emitted('recorded')).toBeUndefined();
            });
    });
});
