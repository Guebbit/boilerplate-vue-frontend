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
import { createMemoryHistory, createRouter } from 'vue-router';
import { axeViolations } from '../../../../tests/support/unit/axe.ts';
import { expectWarning } from '../../../../tests/support/unit/expect-warning.ts';
import { VMenu } from 'vuetify/components';
import NotificationsBell from '../components/NotificationsBell.vue';
import { useNotificationsInboxStore } from '../store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import type { Notification } from '@types';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { parseOrvalFixture } from '../../../../tests/support/unit/orval-fixture-schema.ts';

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
                config.method === 'GET' ? { items: inboxOnServer } : undefined
            )
        )
    )
}));

/**
 * A parked-event row, the foundation notice that names a product nowhere: its text carries the row's
 * own id, so each row reads differently.
 */
type OutboxDead = Extract<Notification, { code: 'notifications.staff.outbox-dead' }>;

/**
 * What a case may change on a row.
 */
type RowOverrides = Partial<OutboxDead>;

/**
 * A server row.
 *
 * @param id - The notification id.
 * @param overrides - Fields to replace.
 * @returns A notification as the API lists it.
 */
const row = (id: string, overrides: RowOverrides = {}): Notification => ({
    id,
    code: 'notifications.staff.outbox-dead',
    params: { eventName: `event.${id}`, aggregateId: 'a1' },
    audience: 'own',
    severity: 'info',
    createdAt: '2026-10-04T10:00:00.000Z',
    ...overrides
});

/**
 * Signs a person in.
 */
const signIn = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'shopper@example.com', role: 'customer' };
};

/**
 * A router holding the one sibling route the bell may link to, as the real app's `orders` module
 * would register it.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        {
            path: '/:locale/webhooks/subscriptions/:id',
            name: 'WebhookTarget',
            meta: { access: 'auth', can: ['read', 'WebhookSubscription'] },
            component: { template: '<div />' }
        },
        {
            path: '/:locale/orders/:id',
            name: 'OrderTarget',
            meta: { access: 'auth' },
            component: { template: '<div />' }
        }
    ]
});

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
        global: { plugins: [vuetify, i18n, router] },
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
            'An event (event.n2) could not be delivered after every retry and was parked. Look at the record it was about · #a1.',
            'An event (event.n1) could not be delivered after every retry and was parked. Look at the record it was about · #a1.'
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
            'Delete notification: An event (event.n1) could not be delivered after every retry and was parked. Look at the record it was about · #a1.'
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
        expect(useNotificationsInboxStore().items).toHaveLength(1);
    });

    it('clears all of them with one call', async () => {
        signIn();
        inboxOnServer = [row('n1'), row('n2')];
        await mountBell();
        await openPanel();

        panel()!.querySelector<HTMLElement>('[data-test=notifications-clear-all]')!.click();
        await flushPromises();

        expect(requests()).toContain('DELETE /notifications');
        expect(useNotificationsInboxStore().items).toEqual([]);
    });

    it('moves focus into the panel when it opens', async () => {
        signIn();
        inboxOnServer = [row('n1')];
        await mountBell();
        await openPanel();

        // `after-enter` fires on the transition's end, which jsdom never plays: call what it calls.
        expectWarning('emitted event "after-enter"');
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

        expect(await axeViolations()).toEqual([]);
    });
});

/**
 * A disabled-webhook work notice about the subscription `s9`.
 */
const holdNotice: Notification = {
    id: 'w1',
    audience: 'staff',
    code: 'notifications.staff.webhook-disabled',
    params: { subscriptionId: 's9' },
    severity: 'warning',
    createdAt: '2026-10-04T10:00:00.000Z'
};

/**
 * Switches the open panel to its Work tab, where a work notice lives.
 */
const openWorkTab = async () => {
    document.body.querySelector<HTMLElement>('[data-test=notifications-tab-work]')!.click();
    await flushPromises();
};

/** A lost-parcel notice for one order. */
const lostFor = (id: string, orderNumber: string): Notification => ({
    id,
    code: 'shop-tasks.shipment-lost',
    params: { orderId: `order-${id}`, orderNumber, shipmentId: 's1', reason: 'lost' },
    audience: 'own',
    severity: 'warning',
    createdAt: '2026-10-04T10:00:00.000Z'
});

describe('two notices about two orders', () => {
    it('read as different links, since a link text must say where it goes', async () => {
        signIn();
        inboxOnServer = [lostFor('n1', '2026-000041'), lostFor('n2', '2026-000042')];
        await mountBell();
        await openPanel();

        const texts = [
            ...document.body.querySelectorAll('[data-test=notification-target-link]')
        ].map((link) => link.textContent.trim());

        // Not axe: it reports identical-links-same-purpose as "needs review", never a violation.
        expect(texts).toHaveLength(2);
        expect(texts[0]).toContain('2026-000041');
        expect(texts[1]).toContain('2026-000042');
        expect(new Set(texts).size).toBe(2);
    });
});

describe('two notices of the same code about two records', () => {
    it('read as different links and carry different delete-button names', async () => {
        signIn();
        useSessionStore().tenantAbility = createMongoAbility([
            { action: 'read', subject: 'WebhookSubscription' }
        ]);
        inboxOnServer = ['aaaa1111', 'bbbb2222'].map((subscriptionId, index) => ({
            ...holdNotice,
            id: `w${String(index)}`,
            params: { subscriptionId }
        }));
        await mountBell();
        await openPanel();
        await openWorkTab();

        const linkTexts = [
            ...document.body.querySelectorAll('[data-test=notification-target-link]')
        ].map((link) => link.textContent.trim());
        const deleteNames = [
            ...document.body.querySelectorAll('[data-test=notification-delete]')
        ].map((button) => button.getAttribute('aria-label'));

        // Not axe: it reports identical-links-same-purpose as "needs review", never a violation.
        expect(linkTexts).toHaveLength(2);
        expect(new Set(linkTexts).size).toBe(2);
        expect(linkTexts[0]).toContain('#aaaa1111');
        expect(deleteNames).toHaveLength(2);
        expect(new Set(deleteNames).size).toBe(2);
    });
});

describe('a work notice for staff', () => {
    it('links to the screen it is about when the reader may open it', async () => {
        signIn();
        useSessionStore().tenantAbility = createMongoAbility([
            { action: 'read', subject: 'WebhookSubscription' }
        ]);
        inboxOnServer = [holdNotice];
        await mountBell();
        await openPanel();
        await openWorkTab();

        const link = document.body.querySelector('[data-test=notification-target-link]');

        expect(link?.getAttribute('href')).toBe('/en/webhooks/subscriptions/s9');
    });

    it('is itself the link: its own sentence is the link text, with no separate "open" label', async () => {
        signIn();
        useSessionStore().tenantAbility = createMongoAbility([
            { action: 'read', subject: 'WebhookSubscription' }
        ]);
        inboxOnServer = [holdNotice];
        await mountBell();
        await openPanel();
        await openWorkTab();

        const link = document.body.querySelector('[data-test=notification-target-link]');
        const row = document.body.querySelector('[data-test=notification-w1]');

        expect(link?.textContent.trim()).toContain('webhook subscription');
        expect(row?.querySelectorAll('a')).toHaveLength(1);
        expect(await axeViolations()).toEqual([]);
    });

    it('offers no link where the reader would be refused', async () => {
        signIn();
        inboxOnServer = [holdNotice];
        await mountBell();
        await openPanel();
        await openWorkTab();

        expect(document.body.querySelector('[data-test=notification-target-link]')).toBeNull();
        expect(document.body.querySelector('[data-test=notification-w1]')).not.toBeNull();
    });

    it('offers no link when this build ships no such screen', async () => {
        signIn();
        inboxOnServer = [
            {
                ...holdNotice,
                id: 'w2',
                code: 'notifications.staff.task-assigned',
                params: { taskId: 't1', kind: 'contact' }
            }
        ];
        await mountBell();
        await openPanel();
        await openWorkTab();

        expect(document.body.querySelector('[data-test=notification-target-link]')).toBeNull();
    });
});

/**
 * An own notice and two work notices, one of them already read.
 */
const mixedInbox = (): Notification[] => [
    row('n1'),
    holdNotice,
    {
        ...holdNotice,
        id: 'w3',
        readAt: '2026-10-04T12:00:00.000Z'
    }
];

/**
 * A tab button by its data-test suffix.
 */
const tabButton = (name: 'mine' | 'work') =>
    document.body.querySelector<HTMLElement>(`[data-test=notifications-tab-${name}]`);

/**
 * The ids of the rows the panel lists now.
 */
const listedIds = () =>
    [...document.body.querySelectorAll<HTMLElement>('[data-test^="notification-"]')]
        .map((node) => node.dataset.test ?? '')
        .filter((name) => /^notification-[a-z]\d+$/.test(name))
        .map((name) => name.replace('notification-', ''));

describe('the panel for a person who holds work notices', () => {
    it('shows no tabs to someone with only their own notices', async () => {
        signIn();
        inboxOnServer = [row('n1')];
        await mountBell();
        await openPanel();

        expect(tabButton('work')).toBeNull();
        expect(listedIds()).toEqual(['n1']);
    });

    it('splits into Mine and Work, opening on Mine', async () => {
        signIn();
        inboxOnServer = mixedInbox();
        await mountBell();
        await openPanel();

        expect(tabButton('mine')?.getAttribute('aria-selected')).toBe('true');
        expect(listedIds()).toEqual(['n1']);
    });

    it('opens on Mine even when only Work has unread rows', async () => {
        signIn();
        inboxOnServer = [row('n1', { readAt: '2026-10-04T12:00:00.000Z' }), holdNotice];
        await mountBell();
        await openPanel();

        expect(tabButton('mine')?.getAttribute('aria-selected')).toBe('true');
        expect(listedIds()).toEqual(['n1']);
    });

    it('lists only the work notices on the Work tab', async () => {
        signIn();
        inboxOnServer = mixedInbox();
        await mountBell();
        await openPanel();
        tabButton('work')!.click();
        await flushPromises();

        expect(listedIds().toSorted()).toEqual(['w1', 'w3']);
    });

    it('keeps the bell badge at the total and gives the Work tab its own count', async () => {
        signIn();
        inboxOnServer = mixedInbox();
        await mountBell();

        expect(wrapper!.get('[data-test=notifications-badge]').text()).toContain('2');

        await openPanel();

        // Opening marked everything read; the tab still counts what was new when it opened.
        expect(
            document.body
                .querySelector('[data-test=notifications-tab-work-count]')
                ?.textContent?.trim()
        ).toBe('1');
        expect(tabButton('work')?.getAttribute('aria-label')).toBe('Work: 1 unread');
    });

    it('clears only the tab in view', async () => {
        signIn();
        inboxOnServer = mixedInbox();
        await mountBell();
        await openPanel();
        tabButton('work')!.click();
        await flushPromises();
        panel()!.querySelector<HTMLElement>('[data-test=notifications-clear-all]')!.click();
        await flushPromises();

        const calls = vi
            .mocked(orvalMutator)
            .mock.calls.map(
                ([config]) => config as { method: string; url: string; params?: unknown }
            )
            .filter(({ method }) => method === 'DELETE');

        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({ url: '/notifications', params: { audience: 'staff' } });
        expect(useNotificationsInboxStore().items.map(({ id }) => id)).toEqual(['n1']);
    });

    it('falls back to Mine, without tabs, once the last work notice is gone', async () => {
        signIn();
        inboxOnServer = [row('n1'), holdNotice];
        await mountBell();
        await openPanel();
        tabButton('work')!.click();
        await flushPromises();
        await useNotificationsInboxStore().dismiss('w1');
        await flushPromises();

        expect(tabButton('work')).toBeNull();
        expect(listedIds()).toEqual(['n1']);
    });

    it('breaks no accessibility rule with the tabs showing', async () => {
        signIn();
        inboxOnServer = mixedInbox();
        await mountBell();
        await openPanel();
        tabButton('work')!.click();
        await flushPromises();

        expect(await axeViolations()).toEqual([]);
    });
});
