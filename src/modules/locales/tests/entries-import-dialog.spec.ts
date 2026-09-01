/**
 * @module
 * Mounts the import dialog directly, stubbing Vuetify's `v-dialog` shell so its content renders
 * regardless of open state — the confirmation gate under test lives in the component's own
 * script, not in the overlay Vuetify manages. `useDialogStore` runs for real: `store.answer()` is
 * how a person's accept/decline in the confirmation prompt reaches this component, the same
 * contract `tests/unit/ui/dialog.spec.ts` pins.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EntriesImportDialog from '@/modules/locales/components/EntriesImportDialog.vue';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import type { LocaleTenantDescriptor } from '@types';
import { LocaleTenantKind } from '@types';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

const TENANT: LocaleTenantDescriptor = {
    id: 'demo-be',
    label: 'Demo backend',
    kind: LocaleTenantKind.backend
};

const VALID_JSON = JSON.stringify({ generic: { 'error-internal': 'Oops' } });

/**
 * Mounts the dialog closed, then opens it via `v-model` — the same transition a real visit makes,
 * and the one `watch(isOpen, ...)` resets `mode` to `merge` and `tenant` to its default on.
 *
 * @returns The mounted wrapper.
 */
const mountDialog = () => {
    const wrapper = mount(EntriesImportDialog, {
        props: { modelValue: false, tenants: [TENANT] },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return wrapper.setProps({ modelValue: true }).then(() => wrapper);
};

/**
 * Fills the paste area with valid JSON and picks the given mode.
 *
 * @param wrapper - The mounted dialog.
 * @param mode - Which radio to select.
 */
const fillForm = (wrapper: Awaited<ReturnType<typeof mountDialog>>, mode: 'merge' | 'replace') =>
    wrapper
        .get('[data-test=import-json] textarea')
        .setValue(VALID_JSON)
        .then(() => wrapper.get(`input[value=${mode}]`).setValue());

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('a replace-mode import', () => {
    it('emits nothing when the confirmation is dismissed', () =>
        mountDialog()
            .then((wrapper) => fillForm(wrapper, 'replace').then(() => wrapper))
            .then((wrapper) => {
                void wrapper.get('form').trigger('submit');
                return Promise.resolve().then(() => {
                    useDialogStore().answer(false);
                    return wrapper.vm.$nextTick().then(() => {
                        expect(wrapper.emitted('import')).toBeUndefined();
                    });
                });
            }));

    it('emits the import once the confirmation is accepted', () =>
        mountDialog()
            .then((wrapper) => fillForm(wrapper, 'replace').then(() => wrapper))
            .then((wrapper) => {
                void wrapper.get('form').trigger('submit');
                return Promise.resolve().then(() => {
                    useDialogStore().answer(true);
                    // Two hops: `confirm()`'s promise resolving, then `handleImport`'s own
                    // `.then()` that emits — one `$nextTick()` lands between them, not after both.
                    return wrapper.vm
                        .$nextTick()
                        .then(() => wrapper.vm.$nextTick())
                        .then(() => {
                            const emitted = wrapper.emitted('import');
                            expect(emitted).toHaveLength(1);
                            expect(emitted?.[0]?.[0]).toMatchObject({
                                mode: 'replace',
                                tenant: TENANT.id
                            });
                        });
                });
            }));
});

describe('a merge-mode import', () => {
    it('emits immediately, asking no confirmation — merge deletes nothing', () =>
        mountDialog()
            .then((wrapper) => fillForm(wrapper, 'merge').then(() => wrapper))
            .then((wrapper) =>
                wrapper
                    .get('form')
                    .trigger('submit')
                    .then(() => {
                        const emitted = wrapper.emitted('import');
                        expect(emitted).toHaveLength(1);
                        expect(emitted?.[0]?.[0]).toMatchObject({ mode: 'merge' });
                        // A confirmation on the safe path trains people to click through the
                        // dangerous one — nothing should be left waiting in the queue.
                        expect(useDialogStore().queue).toHaveLength(0);
                    })
            ));
});
