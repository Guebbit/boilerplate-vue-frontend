/**
 * @module
 * `PreorderLimitDialog.vue` — staff setting one product's preorder limit. Mounts the real dialog
 * with `v-dialog` stubbed inline and the store's `setLimit` spied. Covered: the field opens on the
 * current limit, the saved number is the one typed (zero included), and a refusal stays in the dialog.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PreorderLimitDialog from '../components/PreorderLimitDialog.vue';
import { useInventoryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aLevel } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * Mounts the dialog closed, then opens it through `v-model`.
 *
 * @returns The wrapper and the spied `setLimit`.
 */
const openDialog = () => {
    const setLimit = vi
        .spyOn(useInventoryStore(), 'setLimit')
        .mockResolvedValue(aLevel({ preorderLimit: 5 }));
    const wrapper = mount(PreorderLimitDialog, {
        props: { modelValue: false, level: aLevel({ preorderLimit: 3, preordered: 2 }) },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return wrapper.setProps({ modelValue: true }).then(() => ({ wrapper, setLimit }));
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('PreorderLimitDialog', () => {
    it('opens on the current limit and says what is outstanding', () =>
        openDialog().then(({ wrapper }) => {
            const field = wrapper.get('[data-test=preorder-limit-field] input');

            expect((field.element as HTMLInputElement).value).toBe('3');
            expect(wrapper.text()).toContain('2 are outstanding now');
        }));

    it('saves the typed limit and closes', () =>
        openDialog().then(({ wrapper, setLimit }) =>
            wrapper
                .get('[data-test=preorder-limit-field] input')
                .setValue('5')
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(setLimit).toHaveBeenCalledWith('p1', 5);
                    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
                })
        ));

    it('saves zero, which closes preordering', () =>
        openDialog().then(({ wrapper, setLimit }) =>
            wrapper
                .get('[data-test=preorder-limit-field] input')
                .setValue('0')
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(setLimit).toHaveBeenCalledWith('p1', 0);
                })
        ));

    it('keeps a refusal in the dialog and leaves it open', () =>
        openDialog().then(({ wrapper, setLimit }) => {
            setLimit.mockRejectedValueOnce(new Error('FORBIDDEN'));
            return wrapper
                .get('form')
                .trigger('submit')
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(wrapper.get('[data-test=preorder-limit-error]').text()).toContain(
                        'FORBIDDEN'
                    );
                    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
                });
        }));
});
