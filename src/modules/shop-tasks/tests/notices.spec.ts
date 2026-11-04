/**
 * @module
 * The shop's notice codes, through the registry a module declares them in: which dictionary entry
 * each reaches, with which facts, and which route and params each links to.
 *
 * Driven with a stub translator that prints `key|name=value…`, so each case asserts the entry
 * reached, not the English wording.
 */
import { describe, expect, it } from 'vitest';
import { productName } from '../describe';
import { shopNotices } from '../notices';
import type { Notification } from '@types';
import type { NoticeContext } from '@/kernel/registry';

/**
 * Prints the key and its named values, in the order they were given.
 */
const translate: NoticeContext['translate'] = (key, named) =>
    named
        ? `${key}|${Object.entries(named)
              .map(([name, value]) => `${name}=${String(value)}`)
              .join('|')}`
        : key;

/**
 * The context a bell hands in: English first, dates spelled `<ISO>!` so a case sees the formatter ran.
 */
const context: NoticeContext = {
    preferred: ['en'],
    translate,
    formatDate: (iso) => `${iso}!`
};

/**
 * What a case writes for a row: the code and its facts. The envelope is filled in by {@link full}.
 */
interface Facts {
    code: string;
    params: unknown;
}

/**
 * A complete server row around a case's facts.
 *
 * @param facts - The code and params under test.
 */
// One cast: the case's literals are checked by the contract's own types at the entries, not here.
const full = (facts: Facts) =>
    ({
        id: 'n1',
        audience: 'own',
        severity: 'info',
        createdAt: '2026-10-04T10:00:00.000Z',
        ...facts
    }) as Notification;

/**
 * The entry a code was declared with.
 *
 * @param notice - A row whose code the shop declares.
 */
const entryOf = (notice: Pick<Facts, 'code'>) => {
    const entry = shopNotices[notice.code];
    if (!entry) throw new Error(`no notice declared for ${notice.code}`);
    return entry;
};

/**
 * The sentence a row reads as, with an optional language list.
 *
 * @param facts - The row's code and params.
 * @param preferred - Languages to try for a product name.
 */
const describeOf = (facts: Facts, preferred: readonly string[] = ['en']) =>
    entryOf(facts).describe(full(facts), { ...context, preferred });

/**
 * The facts a late-preorder notice carries, before its optional dates.
 */
const base = {
    orderId: 'o1',
    fulfillmentOrderId: 'fo1',
    titles: ['Vinyl', 'Poster'],
    agreedAt: 'A'
};

/**
 * A late-preorder row, with its optional dates added.
 *
 * @param extra - Extra params.
 */
const delayed = (extra: Record<string, unknown> = {}) => ({
    code: 'shop-tasks.fulfillment-delayed',
    params: { ...base, ...extra }
});

/** A lost-parcel notice's sentence. */
const lost = (extra: Record<string, unknown> = {}, reason: 'lost' | 'damaged' = 'lost') =>
    describeOf({
        code: 'shop-tasks.shipment-lost',
        params: { orderId: 'o1', shipmentId: 's1', reason, ...extra }
    });

/** A fulfillment-held notice's sentence. */
const held = (notice: 'check_address' | 'delayed', message?: string) =>
    describeOf({
        code: 'shop-tasks.fulfillment-held',
        params: {
            orderId: 'o1',
            fulfillmentOrderId: 'fo1',
            notice,
            ...(message ? { message } : {})
        }
    });

/**
 * A product's name for a reader who prefers these languages.
 *
 * @param titles - Locale to name.
 * @param preferred - Languages to try, best first.
 */
const name = (titles: Record<string, string>, preferred: string[]) =>
    productName(titles, { preferred, translate });

describe('productName', () => {
    it("takes the reader's language first", () => {
        expect(name({ en: 'Collar', it: 'Collare' }, ['it', 'en'])).toBe('Collare');
    });

    it('falls back to the main language when the reader has no name', () => {
        expect(name({ en: 'Collar' }, ['it', 'en'])).toBe('Collar');
    });

    it('skips an empty name rather than printing nothing', () => {
        expect(name({ it: '', en: 'Collar' }, ['it', 'en'])).toBe('Collar');
    });

    it('uses any name there is when neither preferred language has one', () => {
        expect(name({ de: 'Halsband' }, ['it', 'en'])).toBe('Halsband');
    });

    it('never shows an empty name when another language has a real one', () => {
        expect(name({ en: '', it: 'Tazza' }, ['de'])).toBe('Tazza');
    });

    it('says "a product" when every name is empty or there are none', () => {
        expect(name({ en: '', it: '' }, ['de'])).toBe('shop-tasks.unknown-product');
        expect(name({}, ['it', 'en'])).toBe('shop-tasks.unknown-product');
    });
});

describe('the shop declares exactly its nineteen codes', () => {
    it('lists them', () => {
        expect(Object.keys(shopNotices)).toHaveLength(19);
        expect(Object.keys(shopNotices).every((code) => code.startsWith('shop-tasks.'))).toBe(true);
    });
});

describe('a buyer notice', () => {
    it.each([
        'shop-tasks.cart-line-removed',
        'shop-tasks.wishlist-item-removed',
        'shop-tasks.stock-alert'
    ] as const)('names the product in %s', (code) => {
        expect(describeOf({ code, params: { productId: 'p1', titles: { en: 'Collar' } } })).toBe(
            `${code}|name=Collar`
        );
    });

    it('says "a product" in a notice whose names are all gone', () => {
        expect(
            describeOf({
                code: 'shop-tasks.cart-line-removed',
                params: { productId: 'p1', titles: {} }
            })
        ).toBe('shop-tasks.cart-line-removed|name=shop-tasks.unknown-product');
    });

    it('lists every refused line of a merge with its own name and quantity', () => {
        const text = describeOf(
            {
                code: 'shop-tasks.cart-merge-refused',
                params: {
                    lines: [
                        { productId: 'p1', requested: 2, titles: { en: 'Collar', it: 'Collare' } },
                        { productId: 'p2', requested: 1, titles: { en: 'Leash' } }
                    ]
                }
            },
            ['it', 'en']
        );

        expect(text).toBe(
            [
                'shop-tasks.cart-merge-refused|lines=',
                'shop-tasks.refused-line|name=Collare|requested=2',
                '; ',
                'shop-tasks.refused-line|name=Leash|requested=1'
            ].join('')
        );
    });

    it('falls back to the bare merge sentence when the row lists no line', () => {
        expect(describeOf({ code: 'shop-tasks.cart-merge-refused', params: { lines: [] } })).toBe(
            'shop-tasks.cart-merge-refused-bare'
        );
    });

    it('links no merge, cart or wishlist notice anywhere', () => {
        const notice = {
            code: 'shop-tasks.cart-line-removed',
            params: { productId: 'p1', titles: {} }
        } as const;

        expect(entryOf(notice).target).toBeUndefined();
    });

    describe('a late preorder', () => {
        it('says the new date when the delay has one', () => {
            expect(describeOf(delayed({ expectedAt: 'E' }))).toBe(
                'shop-tasks.fulfillment-delayed|titles=Vinyl, Poster|agreed=A!|expected=E!'
            );
        });

        it('says there is no new date yet when the delay has none', () => {
            expect(describeOf(delayed())).toMatch(/^shop-tasks\.fulfillment-delayed-undated\|/);
        });

        it('opens the order it is about', () => {
            expect(entryOf(delayed()).target?.(full(delayed()))).toEqual({
                route: 'OrderTarget',
                params: { id: 'o1' }
            });
        });
    });

    describe('a hold the buyer can act on', () => {
        it('says what the notice means, in its own sentence', () => {
            expect(held('check_address')).toBe('shop-tasks.fulfillment-held-check_address');
            expect(held('delayed')).toBe('shop-tasks.fulfillment-held-delayed');
        });

        it('adds what the shop wrote for the buyer after it', () => {
            expect(held('delayed', 'Back soon.')).toBe(
                'shop-tasks.fulfillment-held-delayed shop-tasks.fulfillment-held-message|message=Back soon.'
            );
        });

        it('opens the order it is about', () => {
            const notice = {
                code: 'shop-tasks.fulfillment-held',
                params: { orderId: 'o9', fulfillmentOrderId: 'f', notice: 'delayed' }
            } as const;

            expect(entryOf(notice).target?.(full(notice))).toEqual({
                route: 'OrderTarget',
                params: { id: 'o9' }
            });
        });
    });

    describe('a parcel reported lost', () => {
        it('says what happened, once per reason', () => {
            expect(lost()).toBe('shop-tasks.shipment-lost-lost');
            expect(lost({}, 'damaged')).toBe('shop-tasks.shipment-lost-damaged');
        });

        it('adds what is owed only with its date, then the shop’s message', () => {
            expect(lost({ owed: ['Vinyl', 'Poster'], expectedAt: 'D' })).toBe(
                'shop-tasks.shipment-lost-lost shop-tasks.shipment-lost-owed|titles=Vinyl, Poster|expected=D!'
            );
            expect(lost({ owed: ['Vinyl'] })).toBe('shop-tasks.shipment-lost-lost');
            expect(lost({ message: 'Monday.' })).toBe(
                'shop-tasks.shipment-lost-lost shop-tasks.shipment-lost-message|message=Monday.'
            );
        });

        it('opens the order it is about', () => {
            const notice = {
                code: 'shop-tasks.shipment-lost',
                params: { orderId: 'o7', shipmentId: 's1', reason: 'lost' }
            } as const;

            expect(entryOf(notice).target?.(full(notice))).toEqual({
                route: 'OrderTarget',
                params: { id: 'o7' }
            });
        });
    });
});

describe('a work notice for staff', () => {
    const hold = {
        code: 'shop-tasks.staff.purchase-hold-placed',
        params: { userId: 'u9', until: 'U' }
    } as const;

    it('says when the pause ends, in the reader’s date format', () => {
        expect(describeOf(hold)).toBe('shop-tasks.staff.purchase-hold-placed|until=U!');
    });

    it('points a hold at the buyer’s account', () => {
        expect(entryOf(hold).target?.(full(hold))).toEqual({
            route: 'UserTarget',
            params: { id: 'u9' }
        });
    });

    it('needs no facts to say a return waits for a decision, and opens the return', () => {
        const requested = {
            code: 'shop-tasks.staff.return-requested',
            params: { returnId: 'r1', orderId: 'o1' }
        } as const;

        expect(describeOf(requested)).toBe('shop-tasks.staff.return-requested');
        expect(entryOf(requested).target?.(full(requested))).toEqual({
            route: 'ReturnTarget',
            params: { id: 'r1' }
        });
    });
});

describe('a digest summary for staff', () => {
    it.each([
        ['shop-tasks.staff.transfers-due', 'SalesOrders'],
        ['shop-tasks.staff.preorders-late', 'PreordersBoard'],
        ['shop-tasks.staff.delivery-holds-open', 'SalesOrders'],
        ['shop-tasks.staff.withdrawals-awaiting-goods', 'SalesReturns'],
        ['shop-tasks.staff.returns-undecided', 'SalesReturns'],
        ['shop-tasks.staff.low-stock', 'InventoryLedger'],
        ['shop-tasks.staff.unshipped', 'SalesOrders'],
        ['shop-tasks.staff.awaiting-tracking', 'SalesOrders'],
        ['shop-tasks.staff.undelivered', 'SalesOrders'],
        ['shop-tasks.staff.stale-refunds', 'PaymentsList']
    ] as const)('says how many for %s and opens the list it counts', (code, route) => {
        const notice = { code, params: { count: 4 } };

        expect(describeOf(notice)).toBe(`${code}|n=4`);
        expect(entryOf(notice).target?.(full(notice))).toEqual({ route });
    });
});
