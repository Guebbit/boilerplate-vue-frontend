/**
 * @module
 * The "pause checkout" form: it offers a day from tomorrow on, sends the end of that day (UTC)
 * with the trimmed note, and refuses a date that is not a real future day. Mounts the component
 * directly with Vuetify's `v-dialog` shell stubbed so its content renders whatever the open state,
 * the technique `user-access-dialog.spec.ts` uses.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import UserPurchaseHoldDialog from '../components/UserPurchaseHoldDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * Mounts the dialog closed, then opens it through `v-model`: the transition that seeds the form.
 *
 * @returns The wrapper, open.
 */
const mountOpen = () => {
    const wrapper = mount(UserPurchaseHoldDialog, {
        props: { modelValue: false, target: { id: 'u1', name: 'ada' } },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return wrapper.setProps({ modelValue: true }).then(() => wrapper);
};

/**
 * One day after today, as the form's `min` and default.
 *
 * @returns `YYYY-MM-DD`.
 */
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

beforeEach(() => loadLocale('en'));

describe('UserPurchaseHoldDialog', () => {
    it('names the user and says what the hold leaves alone', () =>
        mountOpen().then((wrapper) => {
            expect(wrapper.text()).toContain('Pause checkout for ada');
            expect(wrapper.text()).toContain('pay for, cancel and return');
        }));

    it('confirms with the end of the chosen day and the trimmed note', () =>
        mountOpen().then((wrapper) =>
            wrapper
                .get('[data-test=user-purchase-hold-note] textarea')
                .setValue('  Please write to us.  ')
                .then(() => wrapper.get('[data-test=user-purchase-hold-confirm]').trigger('click'))
                .then(() => {
                    expect(wrapper.emitted('confirm')?.[0]).toEqual([
                        { until: `${tomorrow()}T23:59:59.999Z`, note: 'Please write to us.' }
                    ]);
                })
        ));

    it('leaves the note out when it is blank', () =>
        mountOpen().then((wrapper) =>
            wrapper
                .get('[data-test=user-purchase-hold-confirm]')
                .trigger('click')
                .then(() => {
                    expect(wrapper.emitted('confirm')?.[0]).toEqual([
                        { until: `${tomorrow()}T23:59:59.999Z` }
                    ]);
                })
        ));

    it('refuses a day that is already over, and disables the button', () =>
        mountOpen().then((wrapper) =>
            wrapper
                .get('[data-test=user-purchase-hold-until] input')
                .setValue('2020-01-01')
                .then(() => {
                    expect(
                        wrapper.get('[data-test=user-purchase-hold-confirm]').attributes('disabled')
                    ).toBeDefined();
                    expect(wrapper.text()).toContain('Pick a day from tomorrow on.');
                })
        ));

    it('emits cancel and writes nothing when backed out of', () =>
        mountOpen().then((wrapper) =>
            wrapper
                .get('[data-test=user-purchase-hold-cancel]')
                .trigger('click')
                .then(() => {
                    expect(wrapper.emitted('cancel')).toHaveLength(1);
                    expect(wrapper.emitted('confirm')).toBeUndefined();
                })
        ));
});
