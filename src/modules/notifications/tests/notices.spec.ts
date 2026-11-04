/**
 * @module
 * The foundation's five notice codes, through the registry a module declares them in: which
 * dictionary entry each reaches, and which route and params each links to.
 *
 * Driven with a stub translator that prints `key|name=value…`, so each case asserts the entry
 * reached, not the English wording.
 */
import { describe, expect, it } from 'vitest';
import { foundationNotices } from '../notices';
import type { Notification } from '@types';
import type { NoticeContext } from '@/kernel/registry';

/**
 * Prints the key and its named values, in the order they were given.
 */
const context: NoticeContext = {
    preferred: ['en'],
    translate: (key, named) =>
        named
            ? `${key}|${Object.entries(named)
                  .map(([name, value]) => `${name}=${String(value)}`)
                  .join('|')}`
            : key,
    formatDate: (iso) => `${iso}!`
};

/**
 * The entry a code was declared with.
 *
 * @param notice - A row whose code is one of the five.
 */
const entryOf = (notice: Pick<Notification, 'code'>) => {
    const entry = foundationNotices[notice.code];
    if (!entry) throw new Error(`no notice declared for ${notice.code}`);
    return entry;
};

/**
 * A `task-opened` row about a task of the given kind.
 *
 * @param parameters - the kind, and a contact message's category
 */
const opened = (parameters: { kind: string; category?: string }) =>
    ({
        code: 'notifications.staff.task-opened',
        params: { taskId: 't1', ...parameters }
    }) as Notification;

describe('the foundation declares exactly its five codes', () => {
    it('lists them', () => {
        expect(Object.keys(foundationNotices).toSorted()).toEqual([
            'notifications.staff.outbox-dead',
            'notifications.staff.task-assigned',
            'notifications.staff.task-opened',
            'notifications.staff.task-overdue',
            'notifications.staff.webhook-disabled'
        ]);
    });
});

describe('a webhook switched off', () => {
    const disabled = {
        code: 'notifications.staff.webhook-disabled',
        params: { subscriptionId: 's1' }
    } as Notification;

    it('needs no facts to be said, and opens the subscription', () => {
        expect(entryOf(disabled).describe(disabled, context)).toBe(
            'notifications.staff.webhook-disabled'
        );
        expect(entryOf(disabled).target?.(disabled)).toEqual({
            route: 'WebhookTarget',
            params: { id: 's1' }
        });
    });
});

/**
 * An `outbox-dead` row for a parked event.
 *
 * @param eventName - The parked event (`user.registered`).
 */
const dead = (eventName: string) =>
    ({
        code: 'notifications.staff.outbox-dead',
        params: { eventName, aggregateId: 'x1' }
    }) as Notification;

describe('a dead event', () => {
    it('names the parked event, and opens the account it was about', () => {
        expect(entryOf(dead('user.registered')).describe(dead('user.registered'), context)).toBe(
            'notifications.staff.outbox-dead|event=user.registered'
        );
        expect(entryOf(dead('user.registered')).target?.(dead('user.registered'))).toEqual({
            route: 'UserTarget',
            params: { id: 'x1' }
        });
    });

    it('opens nothing for an event about anything else, an order included', () => {
        expect(entryOf(dead('order.paid')).target?.(dead('order.paid'))).toBeUndefined();
        expect(entryOf(dead('stock.moved')).target?.(dead('stock.moved'))).toBeUndefined();
    });
});

/**
 * The sentence of a task row.
 *
 * @param notice - The row.
 */
const said = (notice: Notification) => entryOf(notice).describe(notice, context);

describe('a task notice', () => {
    it('names a contact message by its category', () => {
        expect(said(opened({ kind: 'contact', category: 'privacy' }))).toBe(
            'notifications.staff.task-opened|what=task-kind.contact · task-category.privacy'
        );
    });

    it('calls a contact message with no category uncategorised', () => {
        expect(said(opened({ kind: 'contact' }))).toContain('task-category.none');
    });

    it('names a system task by its kind alone, even when a category were sent', () => {
        expect(said(opened({ kind: 'dispute', category: 'privacy' }))).toBe(
            'notifications.staff.task-opened|what=task-kind.dispute'
        );
    });

    it('reads a kind from a newer backend as a plain task, never as its key', () => {
        expect(said(opened({ kind: 'from_the_future' }))).toBe(
            'notifications.staff.task-opened|what=task-kind.unknown'
        );
    });

    it('reads a category from a newer backend as none', () => {
        expect(said(opened({ kind: 'contact', category: 'from_the_future' }))).toContain(
            'task-category.none'
        );
    });

    it.each(['notifications.staff.task-overdue', 'notifications.staff.task-assigned'])(
        'says %s the way the opener does, and opens the task page',
        (code) => {
            const notice = {
                code,
                params: { taskId: 't2', kind: 'dispute' }
            } as Notification;

            expect(said(notice)).toBe(`${code}|what=task-kind.dispute`);
            expect(entryOf(notice).target?.(notice)).toEqual({
                route: 'TaskDetail',
                params: { id: 't2' }
            });
        }
    );

    it('links the screen the opener names for the work, query kept, over the task page', () => {
        const withWork = {
            code: 'notifications.staff.task-opened',
            params: { taskId: 't1', kind: 'dispute', work: 'payments?tab=disputes' }
        } as Notification;

        expect(entryOf(withWork).target?.(withWork)).toEqual({ path: 'payments?tab=disputes' });
    });

    it('falls back to the task page when the opener names no work screen', () => {
        const notice = opened({ kind: 'dispute' });

        expect(entryOf(notice).target?.(notice)).toEqual({
            route: 'TaskDetail',
            params: { id: 't1' }
        });
    });
});
