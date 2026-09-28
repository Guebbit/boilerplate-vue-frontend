/**
 * @module
 * Mounts the real admin user-edit page against a real, memory-history router: the trap this form
 * exists to avoid — an unchanged `role` riding along in the `PATCH` and re-running the backend's
 * grant check — and the confirm gate role/active changes go through first. `UserAccessDialog`
 * itself is stubbed; its own picker/confirm behaviour is `user-access-dialog.spec.ts`'s job.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { VSelect } from 'vuetify/components';
import UserEdit from '@/modules/users/views/UserEdit.vue';
import UserAccessDialog from '@/modules/users/components/UserAccessDialog.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn, nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aUser } from '../../../../tests/support/unit/fixtures.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn()
}));

/**
 * The real app router, scoped to the modules this suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The record every test loads and edits. */
const LOADED_USER = aUser({
    id: 'u1',
    username: 'ada',
    email: 'ada@example.com',
    role: 'customer',
    active: true
});

/**
 * Answers every GET with {@link LOADED_USER} and every PATCH with a bare success envelope.
 */
const mockTransport = () => {
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.method === 'GET' ? orvalEnvelope(LOADED_USER) : orvalEnvelope()
            )
        )
    );
};

/**
 * The last PATCH request's body, or `undefined` when none was sent.
 */
const lastPatchBody = () =>
    vi.mocked(orvalMutator).mock.calls.find(([config]) => config.method === 'PATCH')?.[0].data as
        Record<string, unknown> | undefined;

/**
 * Mounts the page for user `u1`, as the router would with `props: true` on `users/:id/edit`.
 *
 * @returns The mounted wrapper.
 */
const mountPage = () =>
    mount(UserEdit, {
        props: { id: 'u1' },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' }, UserAccessDialog: true }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockTransport();
    return loadLocale('en').then(() =>
        router.push('/en/users/u1/edit').then(() => router.isReady())
    );
});

describe('UserEdit', () => {
    it('saves an unrelated field change with no role/active in the body, and no dialog', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-username] input').setValue('ada2'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                expect(wrapper.findComponent(UserAccessDialog).props('target')).toBeUndefined();
                const body = lastPatchBody();
                // FA123: proves the PATCH is a shape the real endpoint accepts, not just the
                // shape this test expected — `UpdateUserByIdBody` is a `strictObject`, so a stray
                // key this assertion never thought to name would fail it too.
                expect(contractRequest(schemas.UpdateUserByIdBody, body)).toMatchObject({
                    username: 'ada2',
                    role: undefined,
                    active: undefined
                });
            });
    });

    /**
     * The bug e2e's users.cy.ts (FA123) caught: a record loaded with no phone/website/locale
     * defaults those fields to `''` (see the form's own initial-value note), and sending `''`
     * back trips the contract's own `minLength`/pattern with a live 422 — every edit of a user
     * who has never set any of the three failed, unrelated to what was actually being changed.
     * `contractRequest` (also FA123) is what actually caught it: the old `toMatchObject` here
     * only checked the fields it named, and `locale: ''` slipped past that unnoticed.
     */
    it('omits phone, website and locale from the PATCH when the record has none set', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-username] input').setValue('ada2'))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                const body = lastPatchBody();
                // Proves the PATCH is a shape the real endpoint accepts — a `strictObject` schema
                // that also enforces `minLength`/pattern per field, not just the shape this test
                // expected.
                expect(contractRequest(schemas.UpdateUserByIdBody, body)).toMatchObject({
                    username: 'ada2'
                });
                expect(body?.locale).toBeUndefined();
                expect(body?.phone).toBeUndefined();
                expect(body?.website).toBeUndefined();
            });
    });

    it('opens the confirm dialog on a role change, and omits it from the body until confirmed', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => {
                // Vuetify's `VSelect` drives its value through `update:modelValue`, not the
                // hidden native `<select>` it renders for autofill — emitting the update directly
                // is what `setValue()` would otherwise need a real menu click to reach.
                const roleSelect = wrapper
                    .findAllComponents(VSelect)
                    .find((select) => select.attributes('data-test') === 'user-edit-role');
                if (roleSelect) emitOn(roleSelect, 'update:modelValue', 'manager');
                return nextRenderTick(wrapper);
            })
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => {
                // Nothing sent yet — the dialog is open, waiting on the admin.
                expect(lastPatchBody()).toBeUndefined();
                const dialog = wrapper.findComponent(UserAccessDialog);
                expect(dialog.props('target')).toMatchObject({ id: 'u1', role: 'customer' });
                expect(dialog.props('options')).toMatchObject({
                    skipPicker: true,
                    chosenRole: 'manager'
                });
                emitOn(dialog, 'confirm', { role: 'manager' });
            })
            .then(flushPromises)
            .then(() => {
                // The critical trap: `role` rides along ONLY because it actually changed, not as
                // part of a blanket "send everything" body.
                expect(lastPatchBody()).toMatchObject({ role: 'manager', active: undefined });
            });
    });

    it('sends nothing when the confirm dialog is cancelled', () => {
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-edit-active] input').setValue(false))
            .then(() => wrapper.get('form').trigger('submit'))
            .then(flushPromises)
            .then(() => emitOn(wrapper.findComponent(UserAccessDialog), 'cancel'))
            .then(flushPromises)
            .then(() => {
                expect(lastPatchBody()).toBeUndefined();
            });
    });
});
