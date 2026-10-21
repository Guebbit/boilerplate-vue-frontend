/**
 * @module
 * Mounts the real user detail page against a real, memory-history router — same template as
 * `orders/tests/order-view.spec.ts`. Scoped to one thing: the "History" link only renders for a
 * visitor who actually holds `read:AuditLog` (CASL subject `AuditLog`).
 * `watchUser` is stubbed so the store's own fetch never runs; the user is seeded directly into
 * the dictionary instead.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import User from '../views/User.vue';
import { useUsersStore } from '../store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useDialogStore } from '@/ui/dialog.ts';
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
 * Grants (or withholds) `read:AuditLog`, the ability the "History" link is gated on.
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
            plugins: [router, vuetify, i18n]
        }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/users/u1').then(() => router.isReady()));
});

describe('the "History" link', () => {
    it('is absent for a visitor with no read:AuditLog', () => {
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

    it('stays absent on a build with no observability module, even for a visitor who holds the ability', () => {
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
                        plugins: [noAdminRouter, vuetify, i18n]
                    }
                });

                expect(wrapper.find('[data-test=user-history]').exists()).toBe(false);
            });
    });
});

describe('the purchase hold', () => {
    /** An hour-long hold, as the API leaves it on a record while it is in force. */
    const HELD: UserType = {
        ...A_USER,
        actions: { update: true, ban: true, delete: true },
        purchaseHold: {
            until: '2999-01-01T00:00:00.000Z',
            reason: 'repeated_cancellations',
            setAt: '2026-10-19T10:00:00.000Z'
        }
    };

    it('offers "Pause checkout" to a caller who may ban, and no lift button', () => {
        signIn(false);
        const wrapper = mountUser({
            ...A_USER,
            actions: { update: true, ban: true, delete: true }
        });

        expect(wrapper.find('[data-test=user-pause-checkout]').exists()).toBe(true);
        expect(wrapper.find('[data-test=user-lift-hold]').exists()).toBe(false);
        expect(wrapper.get('[data-test=user-purchase-hold]').text()).toContain('None');
    });

    it('offers neither button to a caller who may not ban', () => {
        signIn(false);
        const wrapper = mountUser({
            ...A_USER,
            actions: { update: true, ban: false, delete: false }
        });

        expect(wrapper.find('[data-test=user-pause-checkout]').exists()).toBe(false);
        expect(wrapper.find('[data-test=user-lift-hold]').exists()).toBe(false);
    });

    it('says why and until when a hold is in force, and offers to lift it', () => {
        signIn(false);
        const wrapper = mountUser(HELD);

        expect(wrapper.get('[data-test=user-purchase-hold]').text()).toContain(
            'Paused after repeated cancellations'
        );
        expect(wrapper.find('[data-test=user-lift-hold]').exists()).toBe(true);
        expect(wrapper.find('[data-test=user-pause-checkout]').exists()).toBe(false);
    });

    it('lifts the hold once the confirmation is accepted', () => {
        signIn(false);
        const store = useUsersStore();
        const lift = vi.spyOn(store, 'liftPurchaseHold').mockResolvedValue({ ...A_USER });
        const wrapper = mountUser(HELD);
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);

        return wrapper
            .get('[data-test=user-lift-hold]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                expect(lift).toHaveBeenCalledWith('u1');
            });
    });

    describe('with the account flagged for review', () => {
        /** Flagged by the shop's rule, no hold in force (it ended, or only paid cancels flagged it). */
        const FLAGGED: UserType = {
            ...A_USER,
            actions: { update: true, ban: true, delete: true },
            purchaseHoldFlaggedAt: '2026-10-19T10:00:00.000Z'
        };

        it('says since when, and offers "Mark as reviewed" next to "Pause checkout"', () => {
            signIn(false);
            const wrapper = mountUser(FLAGGED);

            expect(wrapper.get('[data-test=user-needs-review]').text()).toContain(
                'Needs review since'
            );
            expect(wrapper.find('[data-test=user-mark-reviewed]').exists()).toBe(true);
            expect(wrapper.find('[data-test=user-pause-checkout]').exists()).toBe(true);
        });

        it('shows neither the line nor the button for an account that was never flagged', () => {
            signIn(false);
            const wrapper = mountUser({
                ...A_USER,
                actions: { update: true, ban: true, delete: true }
            });

            expect(wrapper.find('[data-test=user-needs-review]').exists()).toBe(false);
            expect(wrapper.find('[data-test=user-mark-reviewed]').exists()).toBe(false);
        });

        it('offers only "Lift the hold" while a hold is in force: lifting it is the review', () => {
            signIn(false);
            const wrapper = mountUser({
                ...HELD,
                purchaseHoldFlaggedAt: '2026-10-19T10:00:00.000Z'
            });

            expect(wrapper.find('[data-test=user-lift-hold]').exists()).toBe(true);
            expect(wrapper.find('[data-test=user-mark-reviewed]').exists()).toBe(false);
        });

        it('marks the account reviewed through the lift once the confirmation is accepted', () => {
            signIn(false);
            const store = useUsersStore();
            const lift = vi.spyOn(store, 'liftPurchaseHold').mockResolvedValue({ ...A_USER });
            const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
            const wrapper = mountUser(FLAGGED);

            return wrapper
                .get('[data-test=user-mark-reviewed]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(confirm).toHaveBeenCalledWith(
                        expect.objectContaining({ confirmLabel: 'Mark as reviewed' })
                    );
                    expect(lift).toHaveBeenCalledWith('u1');
                });
        });
    });

    it('leaves the hold alone when the confirmation is declined', () => {
        signIn(false);
        const store = useUsersStore();
        const lift = vi.spyOn(store, 'liftPurchaseHold').mockResolvedValue({ ...A_USER });
        const wrapper = mountUser(HELD);
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);

        return wrapper
            .get('[data-test=user-lift-hold]')
            .trigger('click')
            .then(flushPromises)
            .then(() => {
                expect(lift).not.toHaveBeenCalled();
            });
    });
});
