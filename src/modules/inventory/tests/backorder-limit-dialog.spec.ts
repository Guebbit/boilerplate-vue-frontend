/**
 * @module
 * `BackorderLimitDialog.vue` — staff setting one product's backorder limit (or none). Mounts the real dialog
 * with `v-dialog` stubbed inline and the store's `setLimit` spied. Covered: the field opens on the
 * current limit, the saved number is the one typed (zero included), and a refusal stays in the dialog.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BackorderLimitDialog from '../components/BackorderLimitDialog.vue';
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
        .mockResolvedValue(aLevel({ backorderLimit: 5 }));
    const wrapper = mount(BackorderLimitDialog, {
        props: { modelValue: false, level: aLevel({ backorderLimit: 3, backordered: 2 }) },
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

describe('BackorderLimitDialog', () => {
    it('opens on the current limit and says what is outstanding', () =>
        openDialog().then(({ wrapper }) => {
            const field = wrapper.get('[data-test=backorder-limit-field] input');

            expect((field.element as HTMLInputElement).value).toBe('3');
            expect(wrapper.text()).toContain('2 are outstanding now');
        }));

    it('saves the typed limit and closes', () =>
        openDialog().then(({ wrapper, setLimit }) =>
            wrapper
                .get('[data-test=backorder-limit-field] input')
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
                .get('[data-test=backorder-limit-field] input')
                .setValue('0')
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(setLimit).toHaveBeenCalledWith('p1', 0);
                })
        ));

    it('saves "no limit" as null, whatever the number field holds', () =>
        openDialog().then(({ wrapper, setLimit }) =>
            wrapper
                .get('[data-test=backorder-limit-unlimited] input')
                .setValue(true)
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(setLimit).toHaveBeenCalledWith('p1', null);
                })
        ));

    it('opens with "no limit" ticked for a product that has none', () => {
        vi.spyOn(useInventoryStore(), 'setLimit').mockResolvedValue(aLevel());
        const wrapper = mount(BackorderLimitDialog, {
            props: { modelValue: true, level: aLevel({ backorderLimit: null }) },
            global: {
                plugins: [vuetify, i18n],
                stubs: { VDialog: { template: '<div><slot /></div>' } }
            }
        });

        const box = wrapper.get('[data-test=backorder-limit-unlimited] input');

        expect((box.element as HTMLInputElement).checked).toBe(true);
    });

    it('keeps a refusal in the dialog and leaves it open', () =>
        openDialog().then(({ wrapper, setLimit }) => {
            setLimit.mockRejectedValueOnce(new Error('FORBIDDEN'));
            return wrapper
                .get('form')
                .trigger('submit')
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(wrapper.get('[data-test=backorder-limit-error]').text()).toContain(
                        'FORBIDDEN'
                    );
                    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
                });
        }));
});
