/**
 * @module
 * The notification sentence builder: which language a product name is shown in, what stands in
 * for a name that is missing, and that a code from a newer backend still reads as a sentence.
 *
 * Driven with a stub translator that prints `key|name=value…`, so each case asserts which
 * dictionary entry was reached and with what, not the English wording (the store spec covers that).
 */
import { describe, expect, it } from 'vitest';
import { describeNotification, notificationOrderId, productName } from '../domain';
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

/**
 * A confirm-wait notice's sentence, with or without a deadline.
 *
 * @param answerBy - The deadline, when the notice has one.
 */
const confirmNotice = (answerBy?: string) =>
    describeNotification(
        {
            code: 'notifications.preorder-confirm-wait',
            params: { ...base, ...(answerBy ? { answerBy } : {}) }
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
                        code: 'notifications.preorder-delayed',
                        params: { ...base, expectedAt: 'E' }
                    },
                    ['en'],
                    translate,
                    format
                )
            ).toBe(
                'notifications.preorder-delayed|titles=Vinyl, Poster|agreed=A!|expected=E!|answerBy='
            );
        });

        it('says there is no new date yet when the delay has none', () => {
            expect(
                describeNotification(
                    { code: 'notifications.preorder-delayed', params: base },
                    ['en'],
                    translate,
                    format
                )
            ).toMatch(/^notifications\.preorder-delayed-undated\|/);
        });

        it('asks for an answer by the deadline, or without one when there is none', () => {
            expect(confirmNotice('D')).toContain('answerBy=D!');
            expect(confirmNotice('D')).toMatch(/^notifications\.preorder-confirm-wait\|/);
            expect(confirmNotice()).toMatch(/^notifications\.preorder-confirm-wait-bare\|/);
        });

        it('names the order it is about, and no order for any other code', () => {
            expect(
                notificationOrderId({ code: 'notifications.preorder-delayed', params: base })
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
