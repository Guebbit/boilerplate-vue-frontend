/**
 * @module
 * `AuditLog.vue` — one thing to prove: the page reads `target` off its own query string and hands
 * it straight to `AdminAuditTab`, so a "History" link (`User.vue`/`Order.vue`) and the plain
 * `/audit` nav entry land on the same page scoped correctly either way. `AdminAuditTab` itself is
 * stubbed — its own fetching is `admin-audit-tab.spec.ts`'s job.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import AuditLog from '@/modules/observability/views/AuditLog.vue';
import AdminAuditTab from '@/modules/observability/components/AdminAuditTab.vue';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

const mountAuditLog = () =>
    mount(AuditLog, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                AdminAuditTab: true
            }
        }
    });

beforeEach(() => loadLocale('en'));

describe('with no target query param', () => {
    it("passes no target to AdminAuditTab — the shop's whole trail", () => {
        return router.push('/en/audit').then(() => {
            const wrapper = mountAuditLog();

            const tab = wrapper.getComponent(AdminAuditTab);
            expect(tab.props('endpoint')).toBe('shop');
            expect(tab.props('target')).toBeUndefined();
        });
    });
});

describe('with a target query param', () => {
    it("passes it straight through — a record's history", () => {
        return router.push('/en/audit?target=o1').then(() => {
            const wrapper = mountAuditLog();

            expect(wrapper.getComponent(AdminAuditTab).props('target')).toBe('o1');
        });
    });
});
