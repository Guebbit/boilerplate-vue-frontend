/**
 * @module
 * The returns form: it asks before it opens, only sends what was ticked, always carries a reason,
 * and never offers more than is left. The store's call is spied, as the sibling component specs
 * do — the transport is `store.spec.ts`'s job.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VSelect } from 'vuetify/components';
import ReturnRequestForm from '@/modules/returns/components/ReturnRequestForm.vue';
import { useReturnsStore } from '@/modules/returns/store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn } from '../../../../tests/support/unit/fixtures.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';

wireModulesIntoCore();

/**
 * The lines the order page would offer.
 */
const LINES = [
    { productId: 'p1', title: 'Shirt', ordered: 3, remaining: 2 },
    { productId: 'p2', title: 'Mug', ordered: 1, remaining: 1 }
];

/**
 * Mounts the form with the store's call spied BEFORE mount — the component destructures its
 * actions at setup time.
 *
 * @returns the wrapper and the store
 */
const mountForm = () => {
    const store = useReturnsStore();
    vi.spyOn(store, 'openReturn').mockResolvedValue({ kind: 'return', created: aReturn() });
    const wrapper = mount(ReturnRequestForm, {
        props: { orderId: 'o1', lines: LINES },
        global: { plugins: [vuetify, i18n] },
        attachTo: document.body
    });
    return { wrapper, store };
};

/**
 * Opens the form and returns the wrapper for chaining.
 *
 * @param wrapper - the mounted form
 */
const openForm = async (wrapper: ReturnType<typeof mountForm>['wrapper']) => {
    await wrapper.get('[data-test=return-request-open]').trigger('click');
};

/**
 * Ticks a line's checkbox.
 *
 * @param wrapper - the mounted form
 * @param productId - which line
 */
const pick = async (wrapper: ReturnType<typeof mountForm>['wrapper'], productId: string) => {
    await wrapper.get(`[data-test=return-line-pick-${productId}] input`).setValue(true);
};

/**
 * Chooses a reason in the select through its model.
 *
 * @param wrapper - the mounted form
 * @param reason - the reason value
 */
const chooseReason = async (wrapper: ReturnType<typeof mountForm>['wrapper'], reason: string) => {
    emitOn(wrapper.getComponent(VSelect), 'update:modelValue', reason);
    await flushPromises();
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ReturnRequestForm', () => {
    it('shows only the button until the customer opens it', () => {
        const { wrapper } = mountForm();

        expect(wrapper.find('[data-test=return-request-open]').exists()).toBe(true);
        expect(wrapper.find('[data-test=return-request-form]').exists()).toBe(false);
    });

    it('offers each returnable line and no withdrawal reason', async () => {
        const { wrapper } = mountForm();
        await openForm(wrapper);

        expect(wrapper.find('[data-test=return-line-p1]').exists()).toBe(true);
        expect(wrapper.find('[data-test=return-line-p2]').exists()).toBe(true);
        expect(wrapper.getComponent(VSelect).props('items')).toEqual([
            { value: 'defective', title: 'Defective goods' },
            { value: 'wrong_item', title: 'Wrong item' },
            { value: 'other', title: 'Other' }
        ]);
    });

    it('asks for everything that is left when a line is ticked', async () => {
        const { wrapper } = mountForm();
        await openForm(wrapper);
        await pick(wrapper, 'p1');

        const quantity = wrapper.get('[data-test=return-line-quantity-p1] input');
        expect((quantity.element as HTMLInputElement).value).toBe('2');
    });

    it('refuses to submit with nothing ticked or no reason, and calls nothing', async () => {
        const { wrapper, store } = mountForm();
        await openForm(wrapper);

        await wrapper.get('[data-test=return-request-form]').trigger('submit');
        await flushPromises();

        expect(store.openReturn).not.toHaveBeenCalled();
        expect(wrapper.get('[data-test=return-lines-error]').text()).toMatch(/at least one/i);
    });

    it('refuses a quantity above what is left', async () => {
        const { wrapper, store } = mountForm();
        await openForm(wrapper);
        await pick(wrapper, 'p1');
        await wrapper.get('[data-test=return-line-quantity-p1] input').setValue('3');
        await chooseReason(wrapper, 'defective');

        await wrapper.get('[data-test=return-request-form]').trigger('submit');
        await flushPromises();

        expect(store.openReturn).not.toHaveBeenCalled();
        expect(wrapper.get('[data-test=return-lines-error]').text()).toMatch(/whole quantity/i);
    });

    it('opens a partial return with only the ticked lines, the reason and the trimmed note', async () => {
        const { wrapper, store } = mountForm();
        await openForm(wrapper);
        await pick(wrapper, 'p1');
        await wrapper.get('[data-test=return-line-quantity-p1] input').setValue('1');
        await chooseReason(wrapper, 'wrong_item');
        await wrapper.get('[data-test=return-note] textarea').setValue('  Wrong size  ');

        await wrapper.get('[data-test=return-request-form]').trigger('submit');
        await flushPromises();

        expect(store.openReturn).toHaveBeenCalledWith({
            orderId: 'o1',
            reason: 'wrong_item',
            note: 'Wrong size',
            lines: [{ productId: 'p1', quantity: 1 }]
        });
        expect(wrapper.emitted('opened')).toHaveLength(1);
        expect(wrapper.find('[data-test=return-request-form]').exists()).toBe(false);
    });

    it('leaves the note out when it is blank', async () => {
        const { wrapper, store } = mountForm();
        await openForm(wrapper);
        await pick(wrapper, 'p2');
        await chooseReason(wrapper, 'defective');

        await wrapper.get('[data-test=return-request-form]').trigger('submit');
        await flushPromises();

        expect(store.openReturn).toHaveBeenCalledWith({
            orderId: 'o1',
            reason: 'defective',
            lines: [{ productId: 'p2', quantity: 1 }]
        });
    });

    it('keeps the form open and shows the server’s message when the return is refused', async () => {
        const { wrapper, store } = mountForm();
        vi.mocked(store.openReturn).mockRejectedValue(
            Object.assign(new Error('closed'), { response: { data: { message: 'Window closed' } } })
        );
        await openForm(wrapper);
        await pick(wrapper, 'p2');
        await chooseReason(wrapper, 'other');

        await wrapper.get('[data-test=return-request-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.emitted('opened')).toBeUndefined();
        expect(wrapper.find('[data-test=return-request-form]').exists()).toBe(true);
        expect(wrapper.find('[data-test=return-request-error]').exists()).toBe(true);
    });

    it('forgets what was typed when cancelled', async () => {
        const { wrapper } = mountForm();
        await openForm(wrapper);
        await pick(wrapper, 'p1');

        await wrapper.get('[data-test=return-request-cancel]').trigger('click');
        await openForm(wrapper);

        expect(wrapper.find('[data-test=return-line-quantity-p1]').exists()).toBe(false);
    });
});
