/**
 * @module
 * The "History" link on a return's page: the audit log filtered on that return, shown only to a
 * caller who may read the audit log. Its own file: `return-target.spec.ts` mocks the router away,
 * and the link needs the real route table.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import ReturnTarget from '../views/ReturnTarget.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { useSessionStore } from '@/infrastructure/session.ts';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn } from './return-fixtures.ts';

wireModulesIntoCore();

/**
 * The real app router, so the History link resolves to the real audit route.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Answers `GET /returns/r1` and opens the page on it.
 *
 * @returns The mounted wrapper, once the read has landed.
 */
const openReturn = () => {
    server.use(http.get('*/returns/r1', () => HttpResponse.json(aReturn({ id: 'r1' }))));
    return router
        .push('/en/returns/r1')
        .then(() => router.isReady())
        .then(() =>
            mount(ReturnTarget, {
                props: { id: 'r1' },
                global: { plugins: [router, vuetify, i18n] }
            })
        )
        .then((wrapper) => flushPromises().then(() => wrapper));
};

/**
 * Grants (or withholds) `read:AuditLog`, the ability the link is gated on.
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

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ReturnTarget history', () => {
    it('links to the audit log filtered on the return, for a caller who may read it', () => {
        signIn(true);

        return openReturn().then((wrapper) => {
            expect(wrapper.get('[data-test=return-history]').attributes('href')).toBe(
                '/en/audit?target=r1'
            );
        });
    });

    it('is absent for a caller without read:AuditLog', () => {
        signIn(false);

        return openReturn().then((wrapper) => {
            expect(wrapper.find('[data-test=return-history]').exists()).toBe(false);
        });
    });
});
