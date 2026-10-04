/**
 * @module
 * The notification sentence builder: which language a product name is shown in, what stands in
 * for a name that is missing, and that a malformed or unknown row still reads as a sentence.
 *
 * Driven with a stub translator that prints `key|name=value…`, so each case asserts which
 * dictionary entry was reached and with what, not the English wording (the store spec covers that).
 */
import { describe, expect, it } from 'vitest';
import { describeNotification, productName } from '@/modules/notifications/domain';
import type { Translate } from '@/modules/notifications/domain';

/**
 * Prints the key and its named values, in the order they were given.
 */
const translate: Translate = (key, named) =>
    named
        ? `${key}|${Object.entries(named)
              .map(([name, value]) => `${name}=${String(value)}`)
              .join('|')}`
        : key;

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

    it('still reads when params are not the shape the code promises', () => {
        expect(
            describeNotification(
                { code: 'notifications.cart-line-removed', params: { titles: 'oops' } },
                ['en'],
                translate
            )
        ).toBe('notifications.cart-line-removed|name=notifications.unknown-product');
    });

    it('lists every refused line of a merge with its own name and reason', () => {
        const text = describeNotification(
            {
                code: 'notifications.cart-merge-refused',
                params: {
                    lines: [
                        {
                            productId: 'p1',
                            titles: { en: 'Collar', it: 'Collare' },
                            reason: 'unavailable'
                        },
                        { productId: 'p2', titles: { en: 'Leash' }, reason: 'quantity-limit' }
                    ]
                }
            },
            ['it', 'en'],
            translate
        );

        expect(text).toBe(
            [
                'notifications.cart-merge-refused|lines=',
                'notifications.refused-line|name=Collare|reason=notifications.reason-unavailable',
                '; ',
                'notifications.refused-line|name=Leash|reason=notifications.reason-quantity-limit'
            ].join('')
        );
    });

    it('gives a reason from a newer backend the generic wording', () => {
        const text = describeNotification(
            {
                code: 'notifications.cart-merge-refused',
                params: { lines: [{ productId: 'p1', titles: { en: 'Collar' }, reason: 'new' }] }
            },
            ['en'],
            translate
        );

        expect(text).toContain('reason=notifications.reason-unknown');
    });

    it('drops an unreadable line instead of failing the whole notification', () => {
        const text = describeNotification(
            {
                code: 'notifications.cart-merge-refused',
                params: {
                    lines: [null, 'x', { titles: { en: 'Leash' }, reason: 'unavailable' }]
                }
            },
            ['en'],
            translate
        );

        expect(text).toContain('name=Leash');
        expect(text).not.toContain('null');
    });

    it('falls back to the bare merge sentence when no line can be read', () => {
        expect(
            describeNotification(
                { code: 'notifications.cart-merge-refused', params: { lines: 7 } },
                ['en'],
                translate
            )
        ).toBe('notifications.cart-merge-refused-bare');
    });

    it('reads an unknown code as a generic notification, never as its key', () => {
        expect(
            describeNotification(
                // A code a newer backend may send; the contract's union does not list it.
                { code: 'notifications.from-the-future' as never, params: {} },
                ['en'],
                translate
            )
        ).toBe('notifications.unknown');
    });
});
