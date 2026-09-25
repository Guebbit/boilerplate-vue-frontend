/**
 * @module
 * Mounts the real admin user-detail page against a real, memory-history router: the "Manage
 * access" shortcut's confirm flow, driven through a stubbed `UserAccessDialog` — its own
 * picker/confirm behaviour is `user-access-dialog.spec.ts`'s job.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import UserTarget from '@/modules/users/views/User.vue';
import UserAccessDialog from '@/modules/users/components/UserAccessDialog.vue';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aUser } from '../../../../tests/support/unit/fixtures.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

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

/**
 * Queues GET responses in order, one per call — the initial load, then whatever a mutating action
 * force-refetches afterwards. Any other method the test does not set up its own answer for
 * resolves with a bare success envelope.
 *
 * @param users - One `User` fixture per expected GET, in call order.
 */
const queueGetResponses = (...users: ReturnType<typeof aUser>[]) => {
    let call = 0;
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) => {
        if (config.method === 'GET') {
            const user = users[Math.min(call, users.length - 1)];
            call += 1;
            return Promise.resolve(
                parseOrvalFixture(config.method, config.url, orvalEnvelope(user))
            );
        }
        return Promise.resolve(parseOrvalFixture(config.method, config.url, orvalEnvelope()));
    });
};

/**
 * Mounts the page for user `u1`, as the router would with `props: true` on `users/:id`.
 *
 * @returns The mounted wrapper.
 */
const mountPage = () =>
    mount(UserTarget, {
        props: { id: 'u1' },
        global: {
            plugins: [router, vuetify, i18n],
            // `UserAccessDialog`'s own picker/confirm behaviour is `user-access-dialog.spec.ts`'s
            // job; stubbing it here lets this suite drive its `confirm`/`cancel` events directly,
            // rather than fighting `v-dialog`'s teleport and lazy rendering in jsdom.
            stubs: { LayoutDefault: { template: '<div><slot /></div>' }, UserAccessDialog: true }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en').then(() => router.push('/en/users/u1').then(() => router.isReady()));
});

describe('User (detail page)', () => {
    it('opens the access dialog for the loaded user, and sends only what it confirms', () => {
        queueGetResponses(aUser({ id: 'u1', username: 'ada', role: 'customer', active: true }));
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-manage-access]').trigger('click'))
            .then(flushPromises)
            .then(() => {
                const dialog = wrapper.getComponent(UserAccessDialog);
                expect(dialog.props('target')).toEqual({
                    id: 'u1',
                    name: 'ada',
                    role: 'customer',
                    active: true
                });
                // Only `active` "changed" here — `UserAccessDialog` itself is what decides which
                // fields to include; this stub simulates it having decided `active: false`.
                dialog.vm.$emit('confirm', { active: false });
            })
            .then(flushPromises)
            .then(() => {
                const patchCall = vi
                    .mocked(orvalMutator)
                    .mock.calls.find(([config]) => config.method === 'PATCH');
                expect(patchCall?.[0]).toMatchObject({ url: '/users/u1', method: 'PATCH' });
                expect(patchCall?.[0].data).toEqual({ active: false });
            });
    });

    it('does nothing when the access dialog is cancelled', () => {
        queueGetResponses(aUser({ id: 'u1', username: 'ada', role: 'customer', active: true }));
        const wrapper = mountPage();

        return flushPromises()
            .then(() => wrapper.get('[data-test=user-manage-access]').trigger('click'))
            .then(flushPromises)
            .then(() => wrapper.getComponent(UserAccessDialog).vm.$emit('cancel'))
            .then(flushPromises)
            .then(() => {
                expect(
                    vi.mocked(orvalMutator).mock.calls.some(([config]) => config.method === 'PATCH')
                ).toBe(false);
            });
    });
});
