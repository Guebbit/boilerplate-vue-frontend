/**
 * @module
 * The notification sentence builder: which language a product name is shown in, what stands in
 * for a name that is missing, and that a code from a newer backend still reads as a sentence.
 *
 * Driven with a stub translator that prints `key|name=value…`, so each case asserts which
 * dictionary entry was reached and with what, not the English wording (the store spec covers that).
 */
import { describe, expect, it } from 'vitest';
import {
    describeNotification,
    notificationOrderId,
    notificationTarget,
    productName
} from '../domain';
import type { Translate } from '../domain';

/**
 * Prints the key and its named values, in the order they were given.
 */
const translate: Translate = (key, named) =>
    named
        ? `${key}|${Object.entries(named)
              .map(([name, value]) => `${name}=${String(value)}`)
              .join('|')}`
        : key;

/**
 * Spells a date as `<ISO>!` so a case can see the formatter ran on it.
 */
const format = (iso: string) => `${iso}!`;

/**
 * The facts a late-preorder notice carries, before its optional dates.
 */
const base = {
    orderId: 'o1',
    fulfillmentOrderId: 'fo1',
    titles: ['Vinyl', 'Poster'],
    agreedAt: 'A'
};

/** A lost-parcel notice's sentence. */
const lost = (extra: Record<string, unknown> = {}, reason: 'lost' | 'damaged' = 'lost') =>
    describeNotification(
        {
            code: 'notifications.shipment-lost',
            params: { orderId: 'o1', shipmentId: 's1', reason, ...extra }
        },
        ['en'],
        translate,
        format
    );

/** A fulfillment-held notice's sentence. */
const held = (notice: 'check_address' | 'delayed', message?: string) =>
    describeNotification(
        {
            code: 'notifications.fulfillment-held',
            params: {
                orderId: 'o1',
                fulfillmentOrderId: 'fo1',
                notice,
                ...(message ? { message } : {})
            }
        },
        ['en'],
        translate,
        format
    );

describe('productName', () => {
    it("takes the reader's language first", () => {
        expect(productName({ en: 'Collar', it: 'Collare' }, ['it', 'en'], translate)).toBe(
            'Collare'
        );
    });

    it('falls back to the main language when the reader has no name', () => {
        expect(productName({ en: 'Collar' }, ['it', 'en'], translate)).toBe('Collar');
    });

    it('skips an empty name rather than printing nothing', () => {
        expect(productName({ it: '', en: 'Collar' }, ['it', 'en'], translate)).toBe('Collar');
    });

    it('uses any name there is when neither preferred language has one', () => {
        expect(productName({ de: 'Halsband' }, ['it', 'en'], translate)).toBe('Halsband');
    });

    it('never shows an empty name when another language has a real one', () => {
        expect(productName({ en: '', it: 'Tazza' }, ['de'], translate)).toBe('Tazza');
    });

    it('says "a product" when every name is empty', () => {
        expect(productName({ en: '', it: '' }, ['de'], translate)).toBe(
            'notifications.unknown-product'
        );
    });

    it('says "a product" when there are no names at all', () => {
        expect(productName({}, ['it', 'en'], translate)).toBe('notifications.unknown-product');
    });
});

describe('describeNotification', () => {
    it('names the product in a cart-line notification', () => {
        expect(
            describeNotification(
                {
                    code: 'notifications.cart-line-removed',
                    params: { productId: 'p1', titles: { en: 'Collar' } }
                },
                ['en'],
                translate
            )
        ).toBe('notifications.cart-line-removed|name=Collar');
    });

    it('reaches the wishlist wording for a wishlist notification', () => {
        expect(
            describeNotification(
                {
                    code: 'notifications.wishlist-item-removed',
                    params: { productId: 'p1', titles: { en: 'Collar' } }
                },
                ['en'],
                translate
            )
        ).toBe('notifications.wishlist-item-removed|name=Collar');
    });

    it('names the product in a back-in-stock notification', () => {
        expect(
            describeNotification(
                {
                    code: 'notifications.stock-alert',
                    params: { productId: 'p1', titles: { en: 'Lamp' } }
                },
                ['en'],
                translate
            )
        ).toBe('notifications.stock-alert|name=Lamp');
    });

    it('says "a product" in a cart-line notification whose names are all gone', () => {
        expect(
            describeNotification(
                {
                    code: 'notifications.cart-line-removed',
                    params: { productId: 'p1', titles: {} }
                },
                ['en'],
                translate
            )
        ).toBe('notifications.cart-line-removed|name=notifications.unknown-product');
    });

    it('lists every refused line of a merge with its own name and quantity', () => {
        const text = describeNotification(
            {
                code: 'notifications.cart-merge-refused',
                params: {
                    lines: [
                        { productId: 'p1', requested: 2, titles: { en: 'Collar', it: 'Collare' } },
                        { productId: 'p2', requested: 1, titles: { en: 'Leash' } }
                    ]
                }
            },
            ['it', 'en'],
            translate
        );

        expect(text).toBe(
            [
                'notifications.cart-merge-refused|lines=',
                'notifications.refused-line|name=Collare|requested=2',
                '; ',
                'notifications.refused-line|name=Leash|requested=1'
            ].join('')
        );
    });

    it('falls back to the bare merge sentence when the row lists no line', () => {
        expect(
            describeNotification(
                { code: 'notifications.cart-merge-refused', params: { lines: [] } },
                ['en'],
                translate
            )
        ).toBe('notifications.cart-merge-refused-bare');
    });

    describe('a late preorder', () => {
        it('says the new date when the delay has one', () => {
            expect(
                describeNotification(
                    {
                        code: 'notifications.fulfillment-delayed',
                        params: { ...base, expectedAt: 'E' }
                    },
                    ['en'],
                    translate,
                    format
                )
            ).toBe('notifications.fulfillment-delayed|titles=Vinyl, Poster|agreed=A!|expected=E!');
        });

        it('says there is no new date yet when the delay has none', () => {
            expect(
                describeNotification(
                    { code: 'notifications.fulfillment-delayed', params: base },
                    ['en'],
                    translate,
                    format
                )
            ).toMatch(/^notifications\.fulfillment-delayed-undated\|/);
        });

        it('names the order it is about, and no order for any other code', () => {
            expect(
                notificationOrderId({ code: 'notifications.fulfillment-delayed', params: base })
            ).toBe('o1');
            expect(
                notificationOrderId({
                    code: 'notifications.cart-line-removed',
                    params: { productId: 'p1', titles: {} }
                })
            ).toBeUndefined();
        });
    });

    describe('a hold the buyer can act on', () => {
        it('says what the notice means, in its own sentence', () => {
            expect(held('check_address')).toBe('notifications.fulfillment-held-check_address');
            expect(held('delayed')).toBe('notifications.fulfillment-held-delayed');
        });

        it('adds what the shop wrote for the buyer after it', () => {
            expect(held('delayed', 'Back soon.')).toBe(
                'notifications.fulfillment-held-delayed notifications.fulfillment-held-message|message=Back soon.'
            );
        });

        it('names the order it is about', () => {
            expect(
                notificationOrderId({
                    code: 'notifications.fulfillment-held',
                    params: { orderId: 'o9', fulfillmentOrderId: 'f', notice: 'delayed' }
                })
            ).toBe('o9');
        });
    });

    describe('a parcel reported lost', () => {
        it('says what happened, once per reason', () => {
            expect(lost()).toBe('notifications.shipment-lost-lost');
            expect(lost({}, 'damaged')).toBe('notifications.shipment-lost-damaged');
        });

        it('adds what is owed only with its date, then the shop’s message', () => {
            expect(lost({ owed: ['Vinyl', 'Poster'], expectedAt: 'D' })).toBe(
                'notifications.shipment-lost-lost notifications.shipment-lost-owed|titles=Vinyl, Poster|expected=D!'
            );
            expect(lost({ owed: ['Vinyl'] })).toBe('notifications.shipment-lost-lost');
            expect(lost({ message: 'Monday.' })).toBe(
                'notifications.shipment-lost-lost notifications.shipment-lost-message|message=Monday.'
            );
        });

        it('names the order it is about', () => {
            expect(
                notificationOrderId({
                    code: 'notifications.shipment-lost',
                    params: { orderId: 'o7', shipmentId: 's1', reason: 'lost' }
                })
            ).toBe('o7');
        });
    });

    it('reads an unknown code as a generic notification, never as its key', () => {
        expect(
            describeNotification(
                // A code a newer backend may send; the contract's union does not list it.
                {
                    code: 'notifications.from-the-future' as never,
                    params: { productId: 'p1', titles: {} }
                },
                ['en'],
                translate
            )
        ).toBe('notifications.unknown');
    });
});

describe('a work notice for staff', () => {
    const hold = {
        code: 'notifications.staff.purchase-hold-placed',
        params: { userId: 'u9', until: 'U' }
    } as const;
    const disabled = {
        code: 'notifications.staff.webhook-disabled',
        params: { subscriptionId: 's1' }
    } as const;

    it('says when the pause ends, in the reader’s date format', () => {
        expect(describeNotification(hold, ['en'], translate, format)).toBe(
            'notifications.staff.purchase-hold-placed|until=U!'
        );
    });

    it('needs no facts to say a webhook was switched off', () => {
        expect(describeNotification(disabled, ['en'], translate, format)).toBe(
            'notifications.staff.webhook-disabled'
        );
    });

    it('points a hold at the buyer’s account and a webhook at its subscription', () => {
        expect(notificationTarget(hold)).toEqual({ screen: 'account', id: 'u9' });
        expect(notificationTarget(disabled)).toEqual({ screen: 'webhook-subscription', id: 's1' });
    });

    it('points an ordinary message at no admin screen', () => {
        expect(
            notificationTarget({
                code: 'notifications.cart-line-removed',
                params: { productId: 'p1', titles: {} }
            })
        ).toBeUndefined();
    });
});

/**
 * A `task-opened` notice about a task of the given kind.
 *
 * @param parameters - the kind, and a contact message's category
 */
const opened = (parameters: { kind: string; category?: string }) =>
    ({
        code: 'notifications.staff.task-opened',
        params: { taskId: 't1', ...parameters }
    }) as const;

describe('a return request and a dead event for staff', () => {
    const requested = {
        code: 'notifications.staff.return-requested',
        params: { returnId: 'r1', orderId: 'o1' }
    } as const;
    const dead = (eventName: string) =>
        ({
            code: 'notifications.staff.outbox-dead',
            params: { eventName, aggregateId: 'x1' }
        }) as const;

    it('needs no facts to say a return waits for a decision, and opens the return', () => {
        expect(describeNotification(requested, ['en'], translate)).toBe(
            'notifications.staff.return-requested'
        );
        expect(notificationTarget(requested)).toEqual({ screen: 'return', id: 'r1' });
    });

    it('names the parked event, and opens the order or account it was about', () => {
        expect(describeNotification(dead('order.paid'), ['en'], translate)).toBe(
            'notifications.staff.outbox-dead|event=order.paid'
        );
        expect(notificationTarget(dead('order.paid'))).toEqual({ screen: 'order', id: 'x1' });
        expect(notificationTarget(dead('user.registered'))).toEqual({
            screen: 'account',
            id: 'x1'
        });
    });

    it('opens nothing for an event about neither', () => {
        expect(notificationTarget(dead('stock.moved'))).toBeUndefined();
    });
});

/**
 * A summary notice of the given code, carrying a count of four.
 *
 * @param code - the notice's code
 */
const summary = (code: string) => ({ code, params: { count: 4 } }) as never;

describe('a digest summary for staff', () => {
    it.each([
        ['notifications.staff.transfers-due', 'sales-orders'],
        ['notifications.staff.preorders-late', 'preorders'],
        ['notifications.staff.delivery-holds-open', 'sales-orders'],
        ['notifications.staff.withdrawals-awaiting-goods', 'returns'],
        ['notifications.staff.returns-undecided', 'returns'],
        ['notifications.staff.low-stock', 'inventory'],
        ['notifications.staff.unshipped', 'sales-orders'],
        ['notifications.staff.awaiting-tracking', 'sales-orders'],
        ['notifications.staff.undelivered', 'sales-orders'],
        ['notifications.staff.stale-refunds', 'payments']
    ])('says how many for %s and opens the list it counts', (code, screen) => {
        expect(describeNotification(summary(code), ['en'], translate)).toBe(`${code}|n=4`);
        expect(notificationTarget(summary(code))).toEqual({ screen });
    });
});

describe('a task notice for staff', () => {
    it('names a contact message by its category', () => {
        expect(
            describeNotification(
                opened({ kind: 'contact', category: 'privacy' }),
                ['en'],
                translate
            )
        ).toBe(
            'notifications.staff.task-opened|what=notifications.staff-task-kind-contact · notifications.staff-task-category-privacy'
        );
    });

    it('calls a contact message with no category uncategorised', () => {
        expect(describeNotification(opened({ kind: 'contact' }), ['en'], translate)).toContain(
            'notifications.staff-task-category-none'
        );
    });

    it('names a system task by its kind alone, even when a category were sent', () => {
        const text = describeNotification(
            opened({ kind: 'dispute', category: 'privacy' }),
            ['en'],
            translate
        );

        expect(text).toBe(
            'notifications.staff.task-opened|what=notifications.staff-task-kind-dispute'
        );
    });

    it('reads a kind from a newer backend as a plain task, never as its key', () => {
        expect(describeNotification(opened({ kind: 'from_the_future' }), ['en'], translate)).toBe(
            'notifications.staff.task-opened|what=notifications.staff-task-kind-unknown'
        );
    });

    it('says an open task is overdue, naming it the way the opener does', () => {
        expect(
            describeNotification(
                {
                    code: 'notifications.staff.task-overdue',
                    params: { taskId: 't1', kind: 'contact', category: 'privacy' }
                },
                ['en'],
                translate
            )
        ).toBe(
            'notifications.staff.task-overdue|what=notifications.staff-task-kind-contact · notifications.staff-task-category-privacy'
        );
    });

    it('says a task was given to the reader', () => {
        expect(
            describeNotification(
                {
                    code: 'notifications.staff.task-assigned',
                    params: { taskId: 't1', kind: 'dispute' }
                },
                ['en'],
                translate
            )
        ).toBe('notifications.staff.task-assigned|what=notifications.staff-task-kind-dispute');
    });

    it('points every task notice at the task page', () => {
        expect(notificationTarget(opened({ kind: 'contact' }))).toEqual({
            screen: 'task',
            id: 't1'
        });
        expect(
            notificationTarget({
                code: 'notifications.staff.task-overdue',
                params: { taskId: 't2', kind: 'dispute' }
            })
        ).toEqual({ screen: 'task', id: 't2' });
    });
});
