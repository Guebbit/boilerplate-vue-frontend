/**
 * @module
 * The two locale form dialogs whose parents own the write: while the parent saves, the submit is
 * disabled (a second click or Enter must not send the write twice), and a refusal that names a
 * field is put on it through the dialog's exposed `applyServerErrors`. `v-dialog` is stubbed so
 * the content renders regardless of open state.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EntryFormDialog from '@/modules/locales/components/EntryFormDialog.vue';
import LanguageFormDialog from '@/modules/locales/components/LanguageFormDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { LocaleTenantKind } from '@api';
import { asStub } from '../../../../tests/support/stub';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * A server refusal that names the `key` field, as `onResponseReject` hands it on.
 */
const DUPLICATE_KEY = {
    success: false,
    status: 422,
    message: 'Unprocessable Entity',
    errors: [
        {
            code: 'VALIDATION_ERROR',
            message: 'Key already exists',
            details: { field: 'key' },
            field: 'key'
        }
    ]
};

const GLOBAL = {
    plugins: [vuetify, i18n],
    stubs: { VDialog: { template: '<div><slot /></div>' } }
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

/**
 * Mounts the dialog open.
 *
 * @param saving - Whether the parent's write is in flight.
 */
const mountEntryDialog = (saving: boolean) =>
    mount(EntryFormDialog, {
        props: {
            modelValue: true,
            saving,
            tenants: [{ id: 'demo-be', label: 'Demo', kind: LocaleTenantKind.backend }]
        },
        global: GLOBAL
    });

describe('EntryFormDialog', () => {
    it('disables the submit while the parent saves', () => {
        expect(
            mountEntryDialog(true).get('[data-test=entry-save]').attributes('disabled')
        ).toBeDefined();
    });

    it('leaves the submit enabled otherwise', () => {
        expect(
            mountEntryDialog(false).get('[data-test=entry-save]').attributes('disabled')
        ).toBeUndefined();
    });

    it('puts a refusal that names a field on that field', () => {
        const wrapper = mountEntryDialog(false);
        const dialog = asStub<{ applyServerErrors: (error: unknown) => boolean }>(wrapper.vm);

        expect(dialog.applyServerErrors(DUPLICATE_KEY)).toBe(true);
        return nextTick().then(() => {
            expect(wrapper.get('[data-test=entry-key]').text()).toContain('Key already exists');
        });
    });
});

describe('LanguageFormDialog', () => {
    it('disables the submit while the parent saves', () => {
        const wrapper = mount(LanguageFormDialog, {
            props: { modelValue: true, saving: true },
            global: GLOBAL
        });

        expect(wrapper.get('[data-test=language-save]').attributes('disabled')).toBeDefined();
    });
});
