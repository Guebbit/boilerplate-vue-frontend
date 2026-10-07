/**
 * @module
 * The notification sentence builder: which language a product name is shown in, what stands in
 * for a name that is missing, and that a code from a newer backend still reads as a sentence.
 *
 * Driven with a stub translator that prints `key|name=value…`, so each case asserts which
 * dictionary entry was reached and with what, not the English wording (the store spec covers that).
 */
import { describe, expect, it } from 'vitest';
import { describeNotification, productName } from '../domain';
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
