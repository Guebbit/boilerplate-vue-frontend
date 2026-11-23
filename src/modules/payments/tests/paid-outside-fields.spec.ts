/**
 * @module
 * `PaidOutsideFields` — the statement staff attach to a refund. Pinned: the value is `undefined`
 * while the switch is off, the contract's `PaidOutside` once it is on, and an emptied reference is
 * dropped rather than sent empty.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import PaidOutsideFields from '../components/PaidOutsideFields.vue';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { PaidOutside } from '@types';

wireModulesIntoCore();

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

/**
 * Mounts the fields over a model the test reads back.
 *
 * @param initial - the statement the page starts with
 */
const mountFields = (initial?: PaidOutside) => {
    const model: { value: PaidOutside | undefined } = { value: initial };
    const wrapper = mount(PaidOutsideFields, {
        props: {
            modelValue: initial,
            // eslint-disable-next-line @typescript-eslint/naming-convention -- Vue's v-model listener prop is literally `onUpdate:modelValue`
            'onUpdate:modelValue': (next: PaidOutside | undefined) => {
                model.value = next;
                return wrapper.setProps({ modelValue: next });
            }
        },
        global: { plugins: [vuetify, i18n] }
    });
    return { wrapper, model };
};

describe('PaidOutsideFields', () => {
    it('is off by default: no method or reference to fill', () => {
        const { wrapper, model } = mountFields();

        expect(wrapper.find('[data-test=paid-outside-method]').exists()).toBe(false);
        expect(model.value).toBeUndefined();
    });

    it('starts at cash when switched on, and drops the whole statement when switched off', async () => {
        const { wrapper, model } = mountFields();

        await wrapper.get('[data-test=paid-outside-switch] input').setValue(true);
        expect(model.value).toEqual({ method: 'cash' });
        expect(wrapper.find('[data-test=paid-outside-method]').exists()).toBe(true);

        await wrapper.get('[data-test=paid-outside-reference] input').setValue('R-1');
        expect(model.value).toEqual({ method: 'cash', reference: 'R-1' });

        await wrapper.get('[data-test=paid-outside-switch] input').setValue(false);
        expect(model.value).toBeUndefined();
    });

    it('removes an emptied reference instead of sending an empty one', async () => {
        const { wrapper, model } = mountFields({ method: 'bank_transfer', reference: 'R-1' });

        await wrapper.get('[data-test=paid-outside-reference] input').setValue('');

        expect(model.value).toEqual({ method: 'bank_transfer' });
    });
});
