/**
 * @module
 * `useHistoryLink` — the audit-log link of a staff record page: present only for a record that is
 * known, a build that ships an audit log, and a caller who may read it.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useHistoryLink } from '@/kernel/history-link.ts';
import { useSessionStore } from '@/infrastructure/session.ts';

/**
 * A router with, or without, the `AuditLog` route.
 *
 * @param withAuditLog - Whether the build ships the audit log.
 */
const routerWith = (withAuditLog: boolean) =>
    createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', name: 'Home', component: { render: () => null } },
            ...(withAuditLog
                ? [{ path: '/audit', name: 'AuditLog', component: { render: () => null } }]
                : [])
        ]
    });

/**
 * Grants (or withholds) `read:AuditLog` to a signed-in caller.
 *
 * @param canReadAuditLog - Whether to hold the ability.
 */
const signIn = (canReadAuditLog: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'staff@example.com', role: 'admin' };
    session.setAbilities({
        tenant: canReadAuditLog ? [['read', 'AuditLog']] : [],
        platform: []
    });
};

/**
 * The probe component's render function.
 */
const render = () => h('div');

/**
 * Runs the composable inside a mounted component, as a page would.
 *
 * @param target - What the page passes as the record.
 * @param router - The router the page runs under.
 * @returns The link the composable computes.
 */
const linkFor = (target: () => string | undefined, router: ReturnType<typeof routerWith>) => {
    let link!: ReturnType<typeof useHistoryLink>;
    mount(
        defineComponent({
            setup() {
                link = useHistoryLink(target);
                return render;
            }
        }),
        { global: { plugins: [router] } }
    );
    return link;
};

beforeEach(() => {
    setActivePinia(createPinia());
});

describe('useHistoryLink', () => {
    it('points at the audit log filtered on the record, for a caller who may read it', () => {
        signIn(true);

        expect(linkFor(() => 'p1', routerWith(true)).value).toMatchObject({
            name: 'AuditLog',
            query: { target: 'p1' }
        });
    });

    it('follows the record when it changes, and hides while there is none', () => {
        signIn(true);
        const record = ref<string>();
        const link = linkFor(() => record.value, routerWith(true));

        expect(link.value).toBeUndefined();
        record.value = 'p2';
        expect(link.value).toMatchObject({ name: 'AuditLog', query: { target: 'p2' } });
    });

    it('is hidden for a caller without read:AuditLog', () => {
        signIn(false);

        expect(linkFor(() => 'p1', routerWith(true)).value).toBeUndefined();
    });

    it('is hidden on a build with no audit log, even for a caller who holds the ability', () => {
        signIn(true);

        expect(linkFor(() => 'p1', routerWith(false)).value).toBeUndefined();
    });
});
