/**
 * @module
 * The "History" link on a subscription's page: the audit log filtered on that subscription, shown
 * only to a caller who may read the audit log.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import WebhookTarget from '../views/WebhookTarget.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { useSessionStore } from '@/infrastructure/session.ts';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { server } from '../../../../tests/support/unit/msw-server.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import { GetWebhookSubscriptionResponse } from '@api/schemas';
import type { WebhookSubscription } from '@types';

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
 * Answers `GET /webhooks/subscriptions/s1` and opens the page on it.
 *
 * @returns The mounted wrapper, once the read has landed.
 */
const openSubscription = () => {
    server.use(
        http.get('*/webhooks/subscriptions/s1', () =>
            HttpResponse.json(
                contractBody<WebhookSubscription>(GetWebhookSubscriptionResponse, {
                    id: 's1',
                    url: 'https://example.com/hook',
                    eventTypes: ['order.paid'],
                    enabled: true,
                    consecutiveFailures: 0,
                    secretIds: ['k1'],
                    retiringSecrets: [],
                    actions: {
                        update: true,
                        delete: true,
                        enable: false,
                        disable: true,
                        createSecret: true,
                        deleteSecret: false
                    },
                    createdAt: '2026-09-01T10:00:00.000Z',
                    updatedAt: '2026-09-01T10:00:00.000Z'
                })
            )
        )
    );
    return router
        .push('/en/webhooks/subscriptions/s1')
        .then(() => router.isReady())
        .then(() =>
            mount(WebhookTarget, {
                props: { id: 's1' },
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

describe('WebhookTarget history', () => {
    it('links to the audit log filtered on the subscription, for a caller who may read it', () => {
        signIn(true);

        return openSubscription().then((wrapper) => {
            expect(wrapper.get('[data-test=webhook-history]').attributes('href')).toBe(
                '/en/audit?target=s1'
            );
        });
    });

    it('is absent for a caller without read:AuditLog', () => {
        signIn(false);

        return openSubscription().then((wrapper) => {
            expect(wrapper.find('[data-test=webhook-history]').exists()).toBe(false);
        });
    });
});
