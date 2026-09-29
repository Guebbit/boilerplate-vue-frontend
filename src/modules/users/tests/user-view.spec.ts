/**
 * @module
 * Mounts the real user detail page against a real, memory-history router — same template as
 * `orders/tests/order-view.spec.ts`. Scoped to one thing: the "History" link only renders for a
 * visitor who actually holds `audit.any.read` (CASL subject `AuditLog`) — see FE_PARITY_0924 G2.
 * `watchUser` is stubbed so the store's own fetch never runs; the user is seeded directly into
 * the dictionary instead.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import User from '@/modules/users/views/User.vue';
import { useUsersStore } from '@/modules/users/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { noopWatchHandle } from '../../../../tests/support/unit/watch-handle.ts';
import type { User as UserType } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this test suite enables — so `{ name: 'AuditLog' }`
 * resolves to the real route the "History" link points at.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** A user record, everything but `id` fixed. */
const A_USER: UserType = {
    id: 'u1',
    email: 'ada@example.com',
    username: 'ada',
    role: 'admin',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

/**
 * Grants (or withholds) `audit.any.read`, the ability the "History" link is gated on.
 *
 * @param canReadAuditLog - Whether to hold the ability.
 */
const signIn = (canReadAuditLog: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'operator1', email: 'operator@example.com', role: 'admin' };
    session.setAbilities({
        tenant: canReadAuditLog ? [['read', 'AuditLog']] : [],
        platform: []
    });
};

/**
 * Mounts the detail page with `user` already the store's `currentUser`.
 *
 * @param user - The shape under test.
 * @returns The mounted wrapper.
 */
const mountUser = (user: UserType) => {
    const store = useUsersStore();
    vi.spyOn(store, 'watchUser').mockImplementation(() => noopWatchHandle());
    store.addUser(user);
    store.selectedUserId = user.id;

    return mount(User, {
        props: { id: user.id },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/users/u1').then(() => router.isReady()));
});

describe('the "History" link', () => {
    it('is absent for a visitor with no audit.any.read', () => {
        signIn(false);
        const wrapper = mountUser(A_USER);

        expect(wrapper.find('[data-test=user-history]').exists()).toBe(false);
    });

    it("links to the shop audit trail, filtered to this user's id, for a visitor who holds it", () => {
        signIn(true);
        const wrapper = mountUser(A_USER);

        const link = wrapper.get('[data-test=user-history]');
        expect(link.attributes('href')).toBe('/en/audit?target=u1');
    });

    it('stays absent on a build with no observability module, even for a visitor who holds the ability (FA86)', () => {
        // `observability` is not one of `users`' declared MODULE_EDGES reaches, so `AuditLog` is
        // guarded by `router.hasRoute` rather than assumed — a build missing the module must not
        // throw.
        const noAdminRouter = createRouter({
            history: createMemoryHistory(),
            routes: [
                {
                    path: '/:locale',
                    component: RouterView,
                    children: collectModuleRoutes(
                        enabledModules.filter((appModule) => appModule.name !== 'observability')
                    )
                }
            ]
        });

        signIn(true);
        const store = useUsersStore();
        vi.spyOn(store, 'watchUser').mockImplementation(() => noopWatchHandle());
        store.addUser(A_USER);
        store.selectedUserId = A_USER.id;

        return noAdminRouter
            .push('/en/users/u1')
            .then(() => noAdminRouter.isReady())
            .then(() => {
                const wrapper = mount(User, {
                    props: { id: A_USER.id },
                    global: {
                        plugins: [noAdminRouter, vuetify, i18n],
                        stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
                    }
                });

                expect(wrapper.find('[data-test=user-history]').exists()).toBe(false);
            });
    });
});
