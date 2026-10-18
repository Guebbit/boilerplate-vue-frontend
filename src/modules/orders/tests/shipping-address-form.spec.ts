/**
 * @module
 * The staff "correct the shipping address" form: it starts from the address the order has, refuses
 * an empty required field without calling the API, sends the whole address (the optional phone left
 * out when empty), and blocks in place when the door closed meanwhile. The write itself is the
 * store's job, spied here like the sibling form specs do.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShippingAddressForm from '../components/ShippingAddressForm.vue';
import { useOrdersStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * The address the order ships to now.
 */
const CURRENT = {
    fullName: 'Ada Lovelace',
    street: '12 Analytical Engine Rd',
    city: 'London',
    zip: 'SW1A',
    country: 'GB'
};

/**
 * Mounts the form on an order with {@link CURRENT}, the write spied BEFORE mount.
 */
const mountForm = () => {
    const store = useOrdersStore();
    const correct = vi.spyOn(store, 'correctShippingAddress').mockResolvedValue(undefined as never);
    const wrapper = mount(ShippingAddressForm, {
        props: { orderId: 'o1', address: CURRENT },
        global: { plugins: [vuetify, i18n] }
    });
    return { wrapper, correct };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ShippingAddressForm', () => {
    it('starts from the address the order has, and sends it whole with a changed field', async () => {
        const { wrapper, correct } = mountForm();

        await wrapper
            .get('[data-test=shipping-address-street] input')
            .setValue('14 Analytical Engine Rd');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(correct).toHaveBeenCalledWith('o1', {
            ...CURRENT,
            street: '14 Analytical Engine Rd'
        });
        expect(wrapper.emitted('corrected')).toHaveLength(1);
    });

    it('refuses an emptied required field and calls nothing', async () => {
        const { wrapper, correct } = mountForm();

        await wrapper.get('[data-test=shipping-address-city] input').setValue('');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(correct).not.toHaveBeenCalled();
        expect(wrapper.emitted('corrected')).toBeUndefined();
    });

    it('sends the phone only when there is one', async () => {
        const { wrapper, correct } = mountForm();

        await wrapper.get('[data-test=shipping-address-phone] input').setValue('+44 20 0000 0000');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(correct).toHaveBeenCalledWith('o1', { ...CURRENT, phone: '+44 20 0000 0000' });
    });

    it('blocks in place with the server’s message when the door closed meanwhile', async () => {
        const { wrapper, correct } = mountForm();
        correct.mockRejectedValue(
            Object.assign(new Error('locked'), {
                status: 409,
                errors: [{ code: 'ORDER_ADDRESS_LOCKED', message: 'This order has shipped.' }]
            })
        );

        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=shipping-address-error]').text()).toContain('has shipped');
        expect(wrapper.emitted('corrected')).toBeUndefined();
    });
});
