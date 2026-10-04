/**
 * @module
 * The inbox lifecycle: who gets an inbox and a live stream, what each stream frame does, and what
 * ends it. The stream itself is mocked (`createSseClient`), because what this file owns is the
 * wiring: which url and events are opened, that every (re)open is followed by a read, and that a
 * person leaving takes their notifications with them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import type { EffectScope } from 'vue';
import { createMongoAbility } from '@casl/ability';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useInboxLifecycle } from '@/modules/notifications/composables/use-inbox-lifecycle';
import { useInboxStore } from '@/modules/notifications/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { loadLocale } from '@/i18n';
import type { SseClientCallbacks } from '@/infrastructure/create-sse-client';
import type { Notification, SseEventName } from '@types';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * The fake `close` every mocked stream shares, so closing can be asserted.
 */
const close = vi.fn();

/**
 * The parameters are declared though the body ignores them: `vi.fn(() => …)` would type its
 * `mock.calls` as an empty tuple, and every assertion on what the composable PASSED would be a
 * type error rather than a check.
 */
const createSseClient = vi.fn(
    (_url?: string, _eventNames?: readonly SseEventName[], _callbacks?: SseClientCallbacks) => ({
        close
    })
);

vi.mock('@/infrastructure/create-sse-client', () => ({
    createSseClient: (...parameters: unknown[]) =>
        createSseClient(...(parameters as Parameters<typeof createSseClient>))
}));

/**
 * What `GET /notifications` answers with, replaced per test.
 */
let inboxOnServer: Notification[];

/**
 * When set, `GET /notifications` rejects with it.
 */
let readFailure: unknown;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        readFailure
            ? Promise.reject(readFailure as Error)
            : Promise.resolve(
                  parseOrvalFixture(
                      config.method,
                      config.url,
                      orvalEnvelope({ items: inboxOnServer })
                  )
              )
    )
}));

/**
 * A server row.
 *
 * @param id - The notification id.
 * @returns A notification as the API lists it.
 */
const row = (id: string): Notification => ({
    id,
    code: 'notifications.cart-line-removed',
    params: { productId: 'p1', titles: { en: 'Collar', it: 'Collare' } },
    severity: 'info',
    createdAt: '2026-10-04T10:00:00.000Z'
});

/**
 * Lets the session hold the key every signed-in account has.
 */
const grantNotificationKeys = () => {
    useSessionStore().tenantAbility = createMongoAbility([
        { action: 'read', subject: 'Notification' }
    ]);
};

/**
 * Signs a person in.
 *
 * @param id - Their user id.
 */
const signIn = (id = 'u1') => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id, email: `${id}@example.com`, role: 'customer' };
};

/**
 * The callbacks handed to the last stream opened.
 */
const lastCallbacks = () => createSseClient.mock.calls.at(-1)![2]!;

/**
 * The scope the composable under test lives in, stopped after each case.
 */
let scope: EffectScope;

/**
 * Runs the composable the way a component's setup would.
 *
 * @returns Whether the session may read notifications, as the composable reports it.
 */
const start = () => scope.run(() => useInboxLifecycle())!;

/**
 * How many times the inbox was read.
 */
const readCount = () => vi.mocked(orvalMutator).mock.calls.length;

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    inboxOnServer = [];
    readFailure = undefined;
    scope = effectScope();
    return loadLocale('en');
});

afterEach(() => {
    scope.stop();
});

describe('a guest', () => {
    it('gets no inbox, no stream and no read', async () => {
        const mayRead = start();
        await flushPromises();

        expect(mayRead.value).toBe(false);
        expect(createSseClient).not.toHaveBeenCalled();
        expect(readCount()).toBe(0);
    });
});

describe('a signed-in person', () => {
    it('without the key gets nothing either', async () => {
        signIn();
        start();
        await flushPromises();

        expect(createSseClient).not.toHaveBeenCalled();
        expect(readCount()).toBe(0);
    });

    it('with the key gets the inbox read and the notifications stream opened', async () => {
        signIn();
        grantNotificationKeys();
        inboxOnServer = [row('n1')];
        const mayRead = start();
        await flushPromises();

        expect(mayRead.value).toBe(true);
        expect(useInboxStore().items.map(({ id }) => id)).toEqual(['n1']);
        expect(createSseClient).toHaveBeenCalledTimes(1);
        expect(createSseClient.mock.calls[0]?.[0]).toMatch(/\/notifications\/stream$/);
        expect(createSseClient.mock.calls[0]?.[1]).toEqual([
            'notifications.created',
            'notifications.deleted',
            'notifications.read'
        ]);
    });

    it('is read for again every time the stream opens, since a missed frame is never replayed', async () => {
        signIn();
        grantNotificationKeys();
        start();
        await flushPromises();
        const before = readCount();

        lastCallbacks().onOpen?.();
        await flushPromises();

        expect(readCount()).toBe(before + 1);
    });

    it('finds out about a late-arriving key and starts then', async () => {
        signIn();
        start();
        await flushPromises();
        expect(createSseClient).not.toHaveBeenCalled();

        grantNotificationKeys();
        await flushPromises();

        expect(createSseClient).toHaveBeenCalledTimes(1);
    });

    it('toasts a failed read instead of failing silently', async () => {
        readFailure = { status: 500, errors: [{ message: 'boom' }] };
        signIn();
        grantNotificationKeys();
        start();
        await flushPromises();

        expect(useNotificationsStore().messages.some(({ message }) => message === 'boom')).toBe(
            true
        );
    });
});

/**
 * Brings up a signed-in person and returns the callbacks of their stream.
 *
 * @returns The callbacks the composable handed the stream it opened.
 */
const open = async () => {
    signIn();
    grantNotificationKeys();
    start();
    await flushPromises();
    return lastCallbacks();
};

describe("the stream's frames", () => {
    it('adds a created notification to the bell', async () => {
        const callbacks = await open();

        callbacks.onEvent?.('notifications.created', { notification: row('n1') });

        expect(useInboxStore().items.map(({ id }) => id)).toEqual(['n1']);
    });

    it('removes a deleted one', async () => {
        inboxOnServer = [row('n1'), row('n2')];
        const callbacks = await open();

        callbacks.onEvent?.('notifications.deleted', { all: false, ids: ['n1'] });

        expect(useInboxStore().items.map(({ id }) => id)).toEqual(['n2']);
    });

    it('marks everything read on a read frame', async () => {
        inboxOnServer = [row('n1')];
        const callbacks = await open();

        callbacks.onEvent?.('notifications.read', { readAt: '2026-10-04T12:00:00.000Z' });

        expect(useInboxStore().unreadCount).toBe(0);
    });
});

describe('the end of a session', () => {
    it('closes the stream and takes the notifications with it', async () => {
        signIn();
        grantNotificationKeys();
        inboxOnServer = [row('n1')];
        start();
        await flushPromises();

        useSessionStore().clearSession();
        await flushPromises();

        expect(close).toHaveBeenCalledTimes(1);
        expect(useInboxStore().items).toEqual([]);
    });

    it('swaps the inbox for the next person on the same tab', async () => {
        signIn('u1');
        grantNotificationKeys();
        inboxOnServer = [row('n1')];
        start();
        await flushPromises();

        inboxOnServer = [row('n2')];
        signIn('u2');
        await flushPromises();

        expect(close).toHaveBeenCalledTimes(1);
        expect(createSseClient).toHaveBeenCalledTimes(2);
        expect(useInboxStore().items.map(({ id }) => id)).toEqual(['n2']);
    });

    it('closes the stream when the component that started it goes', async () => {
        signIn();
        grantNotificationKeys();
        start();
        await flushPromises();

        scope.stop();

        expect(close).toHaveBeenCalledTimes(1);
    });
});

describe('a language switch', () => {
    it('rewrites the notifications in the new language', async () => {
        signIn();
        grantNotificationKeys();
        inboxOnServer = [row('n1')];
        start();
        await flushPromises();

        await loadLocale('it');
        await flushPromises();

        expect(useInboxStore().items[0]?.text).toContain('Collare');
        await loadLocale('en');
    });
});
