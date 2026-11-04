/**
 * @module
 * The one resolver of a notice's target: a named target needs a shipped route, a path target must
 * land on a real page (query kept, catch-all refused), and both honour the route's `meta.can`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMongoAbility } from '@casl/ability';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';
import { useNotificationLink } from '../composables/use-notification-link';
import { useSessionStore } from '@/infrastructure/session.ts';
import type { NoticeTarget } from '@/kernel/registry';

/**
 * The router the composable reads: one open page, one gated page, and a catch-all like the app's.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale/tasks/:id', name: 'TaskDetail', component: { template: '<div />' } },
        {
            path: '/:locale/secret',
            name: 'Secret',
            meta: { can: ['read', 'Example'] },
            component: { template: '<div />' }
        },
        { path: '/:catchAll(.*)', name: 'NotFound', component: { template: '<div />' } }
    ]
});

/**
 * A render function that draws nothing: the host component only exists to provide the router.
 */
const renderNothing = () => null;

/**
 * The link-maker, built inside a mounted component the way the bell builds it.
 *
 * @returns The function under test.
 */
const mountLink = (): ((target?: NoticeTarget) => RouteLocationRaw | undefined) => {
    let link!: ReturnType<typeof useNotificationLink>;
    mount(
        defineComponent({
            setup: () => {
                link = useNotificationLink();
                return renderNothing;
            }
        }),
        { global: { plugins: [router] } }
    );
    return link;
};

beforeEach(() => {
    setActivePinia(createPinia());
    useSessionStore().tenantAbility = createMongoAbility([]);
});

describe('a named target', () => {
    it('links a shipped route with its params', () => {
        expect(mountLink()({ route: 'TaskDetail', params: { id: 't1' } })).toBeTruthy();
    });

    it('drops a route this build does not ship', () => {
        expect(mountLink()({ route: 'Nowhere' })).toBeUndefined();
    });

    it('drops a route the reader may not open', () => {
        expect(mountLink()({ route: 'Secret' })).toBeUndefined();
    });

    it('links nothing when there is no target', () => {
        expect(mountLink()()).toBeUndefined();
    });
});

describe('a path target', () => {
    it('keeps the query, since the string form is what gets resolved', () => {
        const link = mountLink()({ path: 'tasks/t1?tab=open' });

        expect(typeof link === 'string' ? link : '').toContain('?tab=open');
        expect(typeof link === 'string' ? link : '').toMatch(/^\/[a-z]{2}\/tasks\/t1/);
    });

    it('drops a path only the catch-all matches', () => {
        expect(mountLink()({ path: 'no/such/page' })).toBeUndefined();
    });

    it('drops a path to a page the reader may not open', () => {
        expect(mountLink()({ path: 'secret' })).toBeUndefined();
    });

    it('opens the gated page for a reader who may', () => {
        const session = useSessionStore();
        session.accessToken = 'test-token';
        session.viewer = { id: 'u1', email: 'a@example.com', role: 'customer' };
        session.tenantAbility = createMongoAbility([{ action: 'read', subject: 'Example' }]);

        expect(mountLink()({ path: 'secret' })).toBeTruthy();
    });
});
