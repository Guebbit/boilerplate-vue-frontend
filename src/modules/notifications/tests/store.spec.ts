/**
 * @module
 * The inbox store against the toolkit's message store: how server rows become persistent messages,
 * how a refetch, a stream frame and the bell's writes change them, and what each failure leaves
 * behind.
 *
 * Transport-mocked like the wishlist store's spec: `orvalMutator` is a router keyed on
 * `METHOD /url`, and every fixture is parsed through the real response schema first, so a
 * canned answer cannot drift from the contract. The generated client, the toolkit store and this
 * store are real, because the property under test is how they work together.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { EToastType, useNotificationsStore } from '@guebbit/vue-toolkit';
import { useInboxStore } from '@/modules/notifications/store';
import { orvalMutator } from '@/infrastructure/http';
import { i18n, loadLocale } from '@/i18n';
import type {
    Notification,
    NotificationCartLineRemoved,
    NotificationWishlistItemRemoved
} from '@types';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * Canned answer per `METHOD /url` key, set by each test before it acts. A payload is wrapped in a
 * resolved promise; a function is called instead, for a route that must fail or act mid-request.
 */
let answers: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method.toUpperCase()} ${config.url}`;
        const answer = answers[key];
        return typeof answer === 'function'
            ? (answer as () => Promise<unknown>)()
            : Promise.resolve(parseOrvalFixture(config.method, config.url, answer));
    })
}));

/**
 * What a case may change on a row: any field of the two product-removed variants, which share a
 * shape, including which of the two it is.
 */
type RowOverrides = Partial<Omit<NotificationCartLineRemoved, 'code'>> & {
    code?: NotificationCartLineRemoved['code'] | NotificationWishlistItemRemoved['code'];
};

/**
 * A server row, with whatever the case needs overridden.
 *
 * @param id - The notification id.
 * @param overrides - Fields to replace.
 * @returns A notification as `GET /notifications` lists it.
 */
const row = (id: string, overrides: RowOverrides = {}): Notification => ({
    id,
    code: 'notifications.cart-line-removed',
    params: { productId: 'p1', titles: { en: 'Collar', it: 'Collare' } },
    severity: 'info',
    createdAt: '2026-10-04T10:00:00.000Z',
    ...overrides
});

/**
 * Makes `GET /notifications` answer with these rows.
 *
 * @param rows - The inbox as the server holds it.
 */
const serverHolds = (rows: Notification[]) => {
    answers['GET /notifications'] = orvalEnvelope({ items: rows });
};

/**
 * An API refusal as `onResponseReject` shapes it.
 */
const refusal = (status: number) => () =>
    Promise.reject(Object.assign(new Error('refused'), { status, errors: [{ message: 'boom' }] }));

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

/**
 * The toolkit store the store under test fills, fresh per test.
 */
const toolkit = () => useNotificationsStore();

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    answers = {
        'POST /notifications/read-all': orvalEnvelope(),
        'POST /notifications/dismiss-all': orvalEnvelope()
    };
    return loadLocale('en');
});

afterEach(() => {
    vi.useRealTimers();
});

describe('sync', () => {
    it("adds every row as a persistent message, newest first, in the reader's language", () => {
        serverHolds([
            row('n1', { createdAt: '2026-10-04T09:00:00.000Z' }),
            row('n2', {
                createdAt: '2026-10-04T11:00:00.000Z',
                code: 'notifications.wishlist-item-removed'
            })
        ]);
        const inbox = useInboxStore();

        return inbox.sync().then(() => {
            expect(inbox.items.map(({ id }) => id)).toEqual(['n2', 'n1']);
            expect(inbox.items[1]?.text).toBe(
                'Removed from your cart because it is no longer available: Collar.'
            );
            expect(inbox.items[0]?.text).toBe(
                'Removed from your wishlist because it is no longer available: Collar.'
            );
        });
    });

    it('adds what was already waiting quietly: in the bell, not thrown up as toasts', () => {
        serverHolds([row('n1')]);

        return useInboxStore()
            .sync()
            .then(() => {
                expect(toolkit().persistentMessages).toHaveLength(1);
                expect(toolkit().messages).toHaveLength(0);
            });
    });

    it('updates a known row in place and leaves a shown toast shown', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1')]);
        return inbox
            .sync()
            .then(() => {
                toolkit().showMessage('n1');
                serverHolds([row('n1', { readAt: '2026-10-04T12:00:00.000Z' })]);
                return inbox.sync();
            })
            .then(() => {
                expect(toolkit().history).toHaveLength(1);
                expect(toolkit().findMessage('n1')?.visible).toBe(true);
                expect(inbox.unreadCount).toBe(0);
            });
    });

    it('gives a quietly added row no auto-hide timer, so a toast shown later is not closed behind the reader', () => {
        vi.useFakeTimers();
        const inbox = useInboxStore();
        serverHolds([row('n1')]);

        return inbox.sync().then(() => {
            expect(vi.getTimerCount()).toBe(0);

            toolkit().showMessage('n1');
            vi.advanceTimersByTime(60_000);

            expect(toolkit().findMessage('n1')?.visible).toBe(true);
        });
    });

    it('does not bring back a toast the reader already closed', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1')]);
        return inbox
            .sync()
            .then(() => inbox.sync())
            .then(() => {
                expect(toolkit().messages).toHaveLength(0);
            });
    });

    it('removes a row the server no longer has, without telling the server', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1'), row('n2')]);
        return inbox
            .sync()
            .then(() => {
                serverHolds([row('n2')]);
                return inbox.sync();
            })
            .then(() => {
                expect(inbox.items.map(({ id }) => id)).toEqual(['n2']);
                expect(requests().filter((request) => request.startsWith('DELETE'))).toEqual([]);
            });
    });

    it('leaves messages that are not notifications alone', () => {
        const inbox = useInboxStore();
        toolkit().addMessage('Saved.', EToastType.SUCCESS);
        toolkit().addMessage('A sticky one', EToastType.PRIMARY, -1, {
            id: 'other',
            persistent: true
        });
        serverHolds([]);

        return inbox.sync().then(() => {
            expect(toolkit().history.map(({ id }) => id)).toContain('other');
            expect(toolkit().history).toHaveLength(2);
            expect(inbox.items).toEqual([]);
        });
    });

    it('does not take a row that arrived on the stream mid-read for one the server dropped', () => {
        const inbox = useInboxStore();
        serverHolds([]);
        // The read was answered before the server wrote n9, but lands after the stream pushed it.
        answers['GET /notifications'] = () => {
            inbox.receiveCreated({ notification: row('n9') });
            return Promise.resolve(
                parseOrvalFixture('GET', '/notifications', orvalEnvelope({ items: [] }))
            );
        };

        return inbox.sync().then(() => {
            expect(inbox.items.map(({ id }) => id)).toEqual(['n9']);
        });
    });

    it('does not mistake a row pushed mid-read for a dropped one when an older read ends first', async () => {
        const inbox = useInboxStore();
        const answerers: ((items: Notification[]) => void)[] = [];
        // Each read stays open until the case answers it, so two can overlap.
        answers['GET /notifications'] = () =>
            new Promise((resolve) => {
                answerers.push((items) => {
                    resolve(parseOrvalFixture('GET', '/notifications', orvalEnvelope({ items })));
                });
            });

        const older = inbox.sync();
        const newer = inbox.sync();
        answerers[0]?.([]);
        await older;
        inbox.receiveCreated({ notification: row('n9') });
        answerers[1]?.([]);
        await newer;

        expect(inbox.items.map(({ id }) => id)).toEqual(['n9']);
    });

    it('words a refused merge from the lines it lists, whether it was read or pushed', () => {
        const refused: Notification = {
            id: 'm1',
            code: 'notifications.cart-merge-refused',
            params: {
                lines: [
                    { productId: 'p1', requested: 2, titles: { en: 'Collar', it: 'Collare' } },
                    { productId: 'p2', requested: 1, titles: { en: 'Leash' } }
                ]
            },
            severity: 'warning',
            createdAt: '2026-10-04T10:00:00.000Z'
        };
        const sentence =
            'Some items from your guest cart are no longer available and were not added: Collar × 2; Leash × 1.';
        const inbox = useInboxStore();
        serverHolds([refused]);

        return inbox.sync().then(() => {
            expect(inbox.items[0]?.text).toBe(sentence);
            inbox.reset();
            inbox.receiveCreated({ notification: refused });

            expect(inbox.items[0]?.text).toBe(sentence);
        });
    });

    it('reports a failed read as a toast, leaving what it had', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1')]);
        return inbox
            .sync()
            .then(() => {
                answers['GET /notifications'] = refusal(500);
                return inbox.sync();
            })
            .then(() => {
                expect(inbox.items.map(({ id }) => id)).toEqual(['n1']);
                expect(toolkit().messages.some(({ message }) => message === 'boom')).toBe(true);
            });
    });
});

/**
 * Makes `GET /notifications` wait for the test, then answer with these rows.
 *
 * @param rows - The inbox the held read will answer with.
 * @returns The way to let the read answer.
 */
const holdRead = (rows: Notification[]) => {
    const held = Promise.withResolvers<undefined>();
    answers['GET /notifications'] = () =>
        held.promise.then(() =>
            parseOrvalFixture('GET', '/notifications', orvalEnvelope({ items: rows }))
        );
    return () => held.resolve(undefined);
};

describe('a read that is still out when something else happens', () => {
    it('does not lose a notification the stream pushed, even for the older of two overlapping reads', async () => {
        const inbox = useInboxStore();
        const releaseOlder = holdRead([]);
        const olderRead = inbox.sync();
        const releaseNewer = holdRead([]);
        const newerRead = inbox.sync();

        inbox.receiveCreated({ notification: row('n1') });
        releaseNewer();
        await newerRead;
        releaseOlder();
        await olderRead;

        expect(inbox.items.map(({ id }) => id)).toEqual(['n1']);
    });

    it('does not bring back a row a deleted frame removed meanwhile', async () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        const release = holdRead([row('n1')]);
        const reading = inbox.sync();

        inbox.receiveDeleted({ all: false, ids: ['n1'] });
        release();
        await reading;

        expect(inbox.items).toEqual([]);
    });

    it('does not bring back a row the owner dismissed meanwhile', async () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        answers['DELETE /notifications/n1'] = orvalEnvelope({});
        const release = holdRead([row('n1')]);
        const reading = inbox.sync();

        const dismissing = inbox.dismiss('n1');
        release();
        await Promise.all([reading, dismissing]);

        expect(inbox.items).toEqual([]);
    });

    it('does not bring back anything after the whole inbox was deleted meanwhile', async () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        const release = holdRead([row('n1')]);
        const reading = inbox.sync();

        inbox.receiveDeleted({ all: true, ids: [] });
        release();
        await reading;

        expect(inbox.items).toEqual([]);
    });

    it('keeps a row read meanwhile read, though the answer still says unread', async () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        const release = holdRead([row('n1')]);
        const reading = inbox.sync();

        inbox.receiveRead({ readAt: '2026-10-04T12:00:00.000Z' });
        release();
        await reading;

        expect(inbox.unreadCount).toBe(0);
    });

    it('writes nothing for a person who is gone: the previous person’s rows never show', async () => {
        const inbox = useInboxStore();
        const release = holdRead([row('secret-of-a')]);
        const reading = inbox.sync();

        inbox.reset();
        release();
        await reading;

        expect(inbox.items).toEqual([]);
    });
});

describe('severity', () => {
    it.each([
        ['info', EToastType.PRIMARY],
        ['success', EToastType.SUCCESS],
        ['warning', EToastType.WARNING],
        ['error', EToastType.DANGER]
    ] as const)('maps %s onto the toolkit variant %s', (severity, expected) => {
        serverHolds([row('n1', { severity })]);
        const inbox = useInboxStore();

        return inbox.sync().then(() => {
            expect(inbox.items[0]?.type).toBe(expected);
        });
    });
});

describe('a stream frame', () => {
    it('shows a new notification as a toast, then only in the bell', () => {
        vi.useFakeTimers();
        const inbox = useInboxStore();

        inbox.receiveCreated({ notification: row('n1') });

        expect(toolkit().messages.map(({ id }) => id)).toEqual(['n1']);
        expect(inbox.unreadCount).toBe(1);

        vi.advanceTimersByTime(8000);

        expect(toolkit().messages).toHaveLength(0);
        expect(inbox.items.map(({ id }) => id)).toEqual(['n1']);
    });

    it('does not show the same notification twice when sync and stream both deliver it', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1')]);
        return inbox.sync().then(() => {
            inbox.receiveCreated({ notification: row('n1') });

            expect(toolkit().history).toHaveLength(1);
            expect(toolkit().messages).toHaveLength(0);
        });
    });

    it('removes the ids a deleted frame names', () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        inbox.receiveCreated({ notification: row('n2') });

        inbox.receiveDeleted({ all: false, ids: ['n1'] });

        expect(inbox.items.map(({ id }) => id)).toEqual(['n2']);
    });

    it('empties the inbox on a deleted frame that says all', () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        inbox.receiveCreated({ notification: row('n2') });

        inbox.receiveDeleted({ all: true, ids: [] });

        expect(inbox.items).toEqual([]);
    });

    it('reads the unread ones on a read frame, and leaves the already read ones read', () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({
            notification: row('n1', { readAt: '2026-10-04T09:00:00.000Z' })
        });
        inbox.receiveCreated({ notification: row('n2') });
        expect(inbox.unreadCount).toBe(1);

        inbox.receiveRead({ readAt: '2026-10-04T12:00:00.000Z' });

        expect(inbox.unreadCount).toBe(0);
        expect(inbox.items.map(({ unread }) => unread)).toEqual([false, false]);
    });

    it('clears the badge on a read frame, keeping the messages', () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });

        inbox.receiveRead({ readAt: '2026-10-04T12:00:00.000Z' });

        expect(inbox.unreadCount).toBe(0);
        expect(inbox.items).toHaveLength(1);
    });
});

describe('markAllRead', () => {
    it('leaves a notification that arrived while the call was out unread', async () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        const answer = Promise.withResolvers<undefined>();
        answers['POST /notifications/read-all'] = () =>
            answer.promise.then(() =>
                parseOrvalFixture('POST', '/notifications/read-all', orvalEnvelope({}))
            );

        const marking = inbox.markAllRead();
        inbox.receiveCreated({ notification: row('n2') });
        answer.resolve(undefined);
        await marking;

        expect(inbox.items.map(({ id, unread }) => [id, unread])).toEqual([
            ['n1', false],
            ['n2', true]
        ]);
    });

    it('tells the server and clears the badge', () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        inbox.receiveCreated({ notification: row('n2') });

        return inbox.markAllRead().then(() => {
            expect(requests()).toEqual(['POST /notifications/read-all']);
            expect(inbox.unreadCount).toBe(0);
            expect(inbox.items.every(({ unread }) => !unread)).toBe(true);
        });
    });

    it('sends nothing when there is nothing unread', () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1', { readAt: '2026-10-04T12:00:00.000Z' }) });

        return inbox.markAllRead().then(() => {
            expect(requests()).toEqual([]);
        });
    });

    it('keeps the badge and toasts the error when the server refuses', () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        answers['POST /notifications/read-all'] = refusal(500);

        return inbox.markAllRead().then(() => {
            expect(inbox.unreadCount).toBe(1);
            expect(toolkit().messages.some(({ message }) => message === 'boom')).toBe(true);
        });
    });
});

describe('dismiss', () => {
    it('deletes on the server and removes it from the bell', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1'), row('n2')]);
        answers['DELETE /notifications/n1'] = orvalEnvelope();

        return inbox
            .sync()
            .then(() => inbox.dismiss('n1'))
            .then(() => {
                expect(requests()).toContain('DELETE /notifications/n1');
                expect(inbox.items.map(({ id }) => id)).toEqual(['n2']);
            });
    });

    it('counts a 404 as done: it was already gone', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1')]);
        answers['DELETE /notifications/n1'] = refusal(404);

        return inbox
            .sync()
            .then(() => inbox.dismiss('n1'))
            .then(() => {
                expect(inbox.items).toEqual([]);
                expect(toolkit().messages).toHaveLength(0);
            });
    });

    it('puts it back and toasts the error when the server refuses', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1')]);
        answers['DELETE /notifications/n1'] = refusal(500);

        return inbox
            .sync()
            .then(() => inbox.dismiss('n1'))
            .then(() => {
                expect(inbox.items.map(({ id }) => id)).toEqual(['n1']);
                expect(toolkit().messages.some(({ message }) => message === 'boom')).toBe(true);
            });
    });
});

describe('dismissAll', () => {
    it('empties the inbox with one call', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1'), row('n2')]);

        return inbox
            .sync()
            .then(() => inbox.dismissAll())
            .then(() => {
                expect(requests().filter((request) => request.startsWith('POST'))).toEqual([
                    'POST /notifications/dismiss-all'
                ]);
                expect(inbox.items).toEqual([]);
            });
    });

    it('leaves a notification that arrived while the call was out', async () => {
        const inbox = useInboxStore();
        inbox.receiveCreated({ notification: row('n1') });
        const answer = Promise.withResolvers<undefined>();
        answers['POST /notifications/dismiss-all'] = () =>
            answer.promise.then(() =>
                parseOrvalFixture('POST', '/notifications/dismiss-all', orvalEnvelope({}))
            );

        const dismissing = inbox.dismissAll();
        inbox.receiveCreated({ notification: row('n2') });
        answer.resolve(undefined);
        await dismissing;

        expect(inbox.items.map(({ id }) => id)).toEqual(['n2']);
    });

    it('leaves everything in place and toasts the error when the server refuses', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1'), row('n2')]);
        answers['POST /notifications/dismiss-all'] = refusal(500);

        return inbox
            .sync()
            .then(() => inbox.dismissAll())
            .then(() => {
                expect(inbox.items).toHaveLength(2);
                expect(toolkit().messages.some(({ message }) => message === 'boom')).toBe(true);
            });
    });
});

describe('reset', () => {
    it('drops the notifications without a word to the server, and only those', () => {
        const inbox = useInboxStore();
        toolkit().addMessage('Saved.', EToastType.SUCCESS);
        inbox.receiveCreated({ notification: row('n1') });

        inbox.reset();

        expect(inbox.items).toEqual([]);
        expect(toolkit().history).toHaveLength(1);
        expect(requests()).toEqual([]);
    });
});

describe('retranslate', () => {
    it('rewrites each text in the new language and shows no toast again', () => {
        const inbox = useInboxStore();
        serverHolds([row('n1')]);

        return inbox
            .sync()
            .then(() => loadLocale('it'))
            .then(() => {
                inbox.retranslate();

                expect(inbox.items[0]?.text).toBe(
                    'Rimosso dal carrello perché non più disponibile: Collare.'
                );
                expect(toolkit().messages).toHaveLength(0);
            })
            .finally(() => loadLocale('en'));
    });

    it("prefers the main language name over just any name when the reader's has none", () => {
        const inbox = useInboxStore();
        serverHolds([
            row('n1', { params: { productId: 'p1', titles: { de: 'Halsband', en: 'Collar' } } })
        ]);

        return inbox
            .sync()
            .then(() => loadLocale('it'))
            .then(() => {
                inbox.retranslate();

                expect(inbox.items[0]?.text).toContain('Collar');
                expect(inbox.items[0]?.text).not.toContain('Halsband');
            })
            .finally(() => loadLocale('en'));
    });

    it('takes any name there is when the shop has no single main language', () => {
        const inbox = useInboxStore();
        const configured = i18n.global.fallbackLocale.value;
        serverHolds([
            row('n1', { params: { productId: 'p1', titles: { de: 'Halsband', en: 'Collar' } } })
        ]);

        return inbox
            .sync()
            .then(() => loadLocale('it'))
            .then(() => {
                // vue-i18n lets a fallback be `false` (none) or a list; neither is one language.
                i18n.global.fallbackLocale.value = false;
                inbox.retranslate();

                expect(inbox.items[0]?.text).toContain('Halsband');
            })
            .finally(() => {
                i18n.global.fallbackLocale.value = configured;
                return loadLocale('en');
            });
    });

    it("shows the main language name when the reader's language has none", () => {
        const inbox = useInboxStore();
        serverHolds([row('n1', { params: { productId: 'p1', titles: { en: 'Collar' } } })]);

        return inbox
            .sync()
            .then(() => loadLocale('it'))
            .then(() => {
                inbox.retranslate();

                expect(inbox.items[0]?.text).toContain('Collar');
            })
            .finally(() => loadLocale('en'));
    });
});
