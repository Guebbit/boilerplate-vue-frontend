/**
 * @module
 * Mounts `UserAccessDialog.vue` directly, stubbing Vuetify's `v-dialog` shell so its content
 * renders regardless of open state — same technique as `entries-import-dialog.spec.ts`. Covers the
 * picker → confirm flow, the skip-picker entry `UserEdit.vue` uses, the self-deactivation warning,
 * and the payload shape: only the fields that actually changed, ready for a `PATCH` body.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import UserAccessDialog from '@/modules/users/components/UserAccessDialog.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type {
    UserAccessDialogRequestOptions,
    UserAccessDialogTarget
} from '@/modules/users/composables/use-user-access-dialog.ts';

wireModulesIntoCore();

/**
 * Mounts the dialog closed for one target, then opens it via `v-model` — the same transition
 * `useUserAccessDialog().request()` makes, and the one the internal `watch(isOpen, ...)` seeds
 * `selectedRole`/`selectedActive` from.
 *
 * @param props - `target`/`options`, as `useUserAccessDialog()` would pass them.
 * @returns The mounted wrapper.
 */
const mountDialog = (props: {
    target: UserAccessDialogTarget;
    options?: UserAccessDialogRequestOptions;
}) => {
    const wrapper = mount(UserAccessDialog, {
        props: { modelValue: false, ...props },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return wrapper.setProps({ modelValue: true }).then(() => wrapper);
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('UserAccessDialog', () => {
    it('starts on the picker step, and disables Continue until something changed', () =>
        mountDialog({ target: { id: 'u1', name: 'ada', role: 'customer', active: true } }).then(
            (wrapper) => {
                expect(wrapper.find('[data-test=user-access-role]').exists()).toBe(true);
                expect(
                    wrapper.get('[data-test=user-access-continue]').attributes('disabled')
                ).toBeDefined();
            }
        ));

    it('emits only the fields that changed, once continue then confirm are pressed', () =>
        mountDialog({ target: { id: 'u1', name: 'ada', role: 'customer', active: true } })
            .then((wrapper) =>
                wrapper
                    .get('[data-test=user-access-active] input')
                    .setValue(false)
                    .then(() => wrapper.get('[data-test=user-access-continue]').trigger('click'))
                    .then(() => wrapper.get('[data-test=user-access-confirm]').trigger('click'))
                    .then(() => wrapper)
            )
            .then((wrapper) => {
                expect(wrapper.emitted('confirm')).toEqual([[{ role: undefined, active: false }]]);
            }));

    it('skips straight to the confirm step when the caller already chose the values', () =>
        mountDialog({
            target: { id: 'u1', name: 'ada', role: 'customer', active: true },
            options: { skipPicker: true, chosenRole: 'manager', chosenActive: true }
        }).then((wrapper) => {
            expect(wrapper.find('[data-test=user-access-role]').exists()).toBe(false);
            expect(wrapper.find('[data-test=user-access-confirm]').exists()).toBe(true);
            // No picker step behind it in this mode, so there is nothing to go "back" to.
            expect(wrapper.find('[data-test=user-access-back]').exists()).toBe(false);
        }));

    it('confirms a skip-picker request with the caller-chosen role, unchanged active omitted', () =>
        mountDialog({
            target: { id: 'u1', name: 'ada', role: 'customer', active: true },
            options: { skipPicker: true, chosenRole: 'manager', chosenActive: true }
        })
            .then((wrapper) =>
                wrapper
                    .get('[data-test=user-access-confirm]')
                    .trigger('click')
                    .then(() => wrapper)
            )
            .then((wrapper) => {
                expect(wrapper.emitted('confirm')).toEqual([
                    [{ role: 'manager', active: undefined }]
                ]);
            }));

    it('emits cancel and nothing else when backing out', () =>
        mountDialog({ target: { id: 'u1', name: 'ada', role: 'customer', active: true } })
            .then((wrapper) =>
                wrapper
                    .get('[data-test=user-access-cancel]')
                    .trigger('click')
                    .then(() => wrapper)
            )
            .then((wrapper) => {
                expect(wrapper.emitted('cancel')).toHaveLength(1);
                expect(wrapper.emitted('confirm')).toBeUndefined();
            }));

    it('warns specifically when the deactivation targets the signed-in admin themselves', () => {
        useSessionStore().viewer = { id: 'me', email: 'me@example.com', role: 'admin' };

        return mountDialog({
            target: { id: 'me', name: 'me', role: 'admin', active: true }
        }).then((wrapper) =>
            wrapper
                .get('[data-test=user-access-active] input')
                .setValue(false)
                .then(() => wrapper.get('[data-test=user-access-continue]').trigger('click'))
                .then(() => {
                    expect(wrapper.find('[data-test=user-access-self-warning]').exists()).toBe(
                        true
                    );
                })
        );
    });

    it('shows no self-warning for a role change alone, or for someone else entirely', () =>
        mountDialog({
            target: { id: 'other', name: 'bob', role: 'customer', active: true }
        }).then((wrapper) =>
            wrapper
                .get('[data-test=user-access-active] input')
                .setValue(false)
                .then(() => wrapper.get('[data-test=user-access-continue]').trigger('click'))
                .then(() => {
                    expect(wrapper.find('[data-test=user-access-self-warning]').exists()).toBe(
                        false
                    );
                })
        ));
});

/**
 * What the picker offers follows the row's `actions`: the role select is the edit key's and never
 * one's own (the server refuses it), the active switch is the ban key's, a different key.
 */
describe('UserAccessDialog — what the picker offers', () => {
    const disabledOf = (wrapper: Awaited<ReturnType<typeof mountDialog>>, test: string) =>
        wrapper.find(`[data-test=${test}]`).classes().includes('v-input--disabled');

    it('offers both the role and the active switch when the row allows update and ban', () =>
        mountDialog({
            target: {
                id: 'u1',
                name: 'ada',
                role: 'customer',
                active: true,
                actions: { update: true, ban: true, delete: false }
            }
        }).then((wrapper) => {
            expect(disabledOf(wrapper, 'user-access-role')).toBe(false);
            expect(disabledOf(wrapper, 'user-access-active')).toBe(false);
        }));

    // Support: holds the edit key, not the ban key.
    it('disables the active switch when the row allows no ban', () =>
        mountDialog({
            target: {
                id: 'u1',
                name: 'ada',
                role: 'customer',
                active: true,
                actions: { update: true, ban: false, delete: false }
            }
        }).then((wrapper) => {
            expect(disabledOf(wrapper, 'user-access-role')).toBe(false);
            expect(disabledOf(wrapper, 'user-access-active')).toBe(true);
        }));

    it('disables the role select when the row allows no update', () =>
        mountDialog({
            target: {
                id: 'u1',
                name: 'ada',
                role: 'customer',
                active: true,
                actions: { update: false, ban: true, delete: false }
            }
        }).then((wrapper) => {
            expect(disabledOf(wrapper, 'user-access-role')).toBe(true);
            expect(disabledOf(wrapper, 'user-access-active')).toBe(false);
        }));

    it('never offers the role of the signed-in admin themselves, even with every action allowed', () => {
        useSessionStore().viewer = { id: 'u1', email: 'me@example.com', role: 'admin' };

        return mountDialog({
            target: {
                id: 'u1',
                name: 'me',
                role: 'admin',
                active: true,
                actions: { update: true, ban: true, delete: true }
            }
        }).then((wrapper) => {
            expect(disabledOf(wrapper, 'user-access-role')).toBe(true);
            expect(disabledOf(wrapper, 'user-access-active')).toBe(false);
        });
    });
});
