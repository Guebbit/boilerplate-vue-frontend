/**
 * @module
 * The app bar's bell as a person meets it: absent for a guest, named for what it holds, and a
 * panel that lists, deletes, clears and marks read. Mounted against the real inbox store and a
 * mocked transport and stream, attached to the document because Vuetify teleports the panel there
 * and axe only audits a real layout tree.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMongoAbility } from '@casl/ability';
import axe from 'axe-core';
import { VMenu } from 'vuetify/components';
import NotificationsBell from '@/modules/notifications/components/NotificationsBell.vue';
import { useInboxStore } from '@/modules/notifications/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import type { Notification } from '@types';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

// The bell starts the inbox lifecycle; its stream is not what is under test here.
vi.mock('@/infrastructure/create-sse-client', () => ({
    createSseClient: vi.fn(() => ({ close: vi.fn() }))
}));

/**
 * What `GET /notifications` answers with, replaced per test.
 */
let inboxOnServer: Notification[];

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.method === 'GET' ? orvalEnvelope({ items: inboxOnServer }) : orvalEnvelope()
            )
        )
    )
}));

/**
 * A server row.
 *
 * @param id - The notification id.
 * @param overrides - Fields to replace.
 * @returns A notification as the API lists it.
 */
const row = (id: string, overrides: Partial<Notification> = {}): Notification => ({
    id,
    code: 'notifications.cart-line-removed',
    params: { productId: 'p1', titles: { en: `Collar ${id}` } },
    severity: 'info',
    createdAt: '2026-10-04T10:00:00.000Z',
    ...overrides
});

/**
 * Signs in a person holding the notifications key.
 */
const signIn = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'shopper@example.com', role: 'customer' };
    session.tenantAbility = createMongoAbility([{ action: 'read', subject: 'Notification' }]);
};

/**
 * The mounted bell, unmounted after each case.
 */
let wrapper: VueWrapper | undefined;

/**
 * Mounts the bell and waits for the first inbox read to land.
 *
 * @returns The wrapper.
 */
const mountBell = async () => {
    wrapper = mount(NotificationsBell, {
        global: { plugins: [vuetify, i18n] },
        attachTo: document.body
    });
    await flushPromises();
    return wrapper;
};

/**
 * Opens the panel by clicking the bell, and waits for it to render.
 */
const openPanel = async () => {
    await wrapper!.get('[data-test=notifications-bell]').trigger('click');
    await flushPromises();
};

/**
 * The panel, wherever Vuetify put it.
 */
const panel = () => document.body.querySelector<HTMLElement>('[data-test=notifications-panel]');

/**
 * Requests the mocked transport saw, as `METHOD url`.
 */
const requests = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.map(
            ([config]) =>
                `${(config as { method: string }).method} ${(config as { url: string }).url}`
        );

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    inboxOnServer = [];
    return loadLocale('en');
});

afterEach(() => {
    wrapper?.unmount();
    wrapper = undefined;
    document.body.innerHTML = '';
});

describe('the bell for a guest', () => {
    it('renders nothing', async () => {
        await mountBell();

        expect(wrapper!.find('[data-test=notifications-bell]').exists()).toBe(false);
    });
});

describe('the bell for a signed-in person', () => {
    it('is named plainly when nothing is unread, with no badge', async () => {
        signIn();
        inboxOnServer = [row('n1', { readAt: '2026-10-04T12:00:00.000Z' })];
        await mountBell();

        expect(wrapper!.get('[data-test=notifications-bell]').attributes('aria-label')).toBe(
            'Notifications'
        );
        expect(wrapper!.find('[data-test=notifications-badge]').exists()).toBe(false);
    });

    it('says how many are unread in its name, and wears the count', async () => {
        signIn();
        inboxOnServer = [row('n1'), row('n2'), row('n3', { readAt: '2026-10-04T12:00:00.000Z' })];
        await mountBell();

        expect(wrapper!.get('[data-test=notifications-bell]').attributes('aria-label')).toBe(
            'Notifications: 2 unread'
        );
        expect(wrapper!.get('[data-test=notifications-badge]').text()).toContain('2');
    });

    it('announces itself as opening a dialog', async () => {
        signIn();
        await mountBell();

        expect(wrapper!.get('[data-test=notifications-bell]').attributes('aria-haspopup')).toBe(
            'dialog'
        );
    });
});

describe('opening the panel', () => {
    it('marks everything read on the server and clears the badge', async () => {
        signIn();
        inboxOnServer = [row('n1')];
        await mountBell();

        await openPanel();

        expect(requests()).toContain('POST /notifications/read-all');
        expect(wrapper!.find('[data-test=notifications-badge]').exists()).toBe(false);
    });

    it('still shows which ones were new while it is open', async () => {
        signIn();
        inboxOnServer = [row('n1'), row('n2', { readAt: '2026-10-04T12:00:00.000Z' })];
        await mountBell();

        await openPanel();

        expect(panel()?.querySelectorAll('[data-test=notification-new]')).toHaveLength(1);
    });

    it('lists the notifications with their text, newest first', async () => {
        signIn();
        inboxOnServer = [
            row('n1', { createdAt: '2026-10-04T09:00:00.000Z' }),
            row('n2', { createdAt: '2026-10-04T11:00:00.000Z' })
        ];
        await mountBell();

        await openPanel();

        const texts = [...panel()!.querySelectorAll('.v-list-item-title')].map(
            (element) => element.textContent
        );
        expect(texts).toEqual([
            'Removed from your cart because it is no longer available: Collar n2.',
            'Removed from your cart because it is no longer available: Collar n1.'
        ]);
    });

    it('says so when there is nothing to list, and offers no Clear all', async () => {
        signIn();
        await mountBell();

        await openPanel();

        expect(panel()?.querySelector('[data-test=notifications-empty]')?.textContent).toContain(
            'no notifications'
        );
        expect(panel()?.querySelector('[data-test=notifications-clear-all]')).toBeNull();
    });

    it('sends no read call when nothing is unread', async () => {
        signIn();
        await mountBell();

        await openPanel();

        expect(requests()).not.toContain('POST /notifications/read-all');
    });
});

describe('inside the panel', () => {
    it('names each delete button after its message', async () => {
        signIn();
        inboxOnServer = [row('n1')];
        await mountBell();
        await openPanel();

        const label = panel()!
            .querySelector('[data-test=notification-delete]')!
            .getAttribute('aria-label');

        expect(label).toBe(
            'Delete notification: Removed from your cart because it is no longer available: Collar n1.'
        );
    });

    it('deletes one notification', async () => {
        signIn();
        inboxOnServer = [row('n1'), row('n2')];
        await mountBell();
        await openPanel();

        panel()!.querySelector<HTMLElement>('[data-test=notification-delete]')!.click();
        await flushPromises();

        expect(requests().filter((request) => request.startsWith('DELETE'))).toHaveLength(1);
        expect(useInboxStore().items).toHaveLength(1);
    });

    it('clears all of them with one call', async () => {
        signIn();
        inboxOnServer = [row('n1'), row('n2')];
        await mountBell();
        await openPanel();

        panel()!.querySelector<HTMLElement>('[data-test=notifications-clear-all]')!.click();
        await flushPromises();

        expect(requests()).toContain('POST /notifications/dismiss-all');
        expect(useInboxStore().items).toEqual([]);
    });

    it('moves focus into the panel when it opens', async () => {
        signIn();
        inboxOnServer = [row('n1')];
        await mountBell();
        await openPanel();

        // `after-enter` fires on the transition's end, which jsdom never plays: call what it calls.
        wrapper!.findComponent(VMenu).vm.$emit('after-enter');
        await flushPromises();

        expect(panel()?.contains(document.activeElement)).toBe(true);
    });
});

describe('the open panel, audited', () => {
    it('breaks no accessibility rule axe can check without a rendered page', async () => {
        signIn();
        inboxOnServer = [row('n1'), row('n2')];
        await mountBell();
        await openPanel();

        // https://github.com/dequelabs/axe-core/blob/master/doc/API.md#api-name-axerun
        // `color-contrast` needs real layout and styles, which jsdom does not compute.
        const results = await axe.run(document.body, {
            rules: { 'color-contrast': { enabled: false }, region: { enabled: false } }
        });

        expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.html}`)).toEqual([]);
    });
});
