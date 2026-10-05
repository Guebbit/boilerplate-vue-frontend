/**
 * @module
 * Property-based tests — the guest cart's pure domain (`domain/guest-cart.ts`) and where it is saved
 * (`composables/guest-cart-storage.ts`).
 *
 * The example specs (`guest-cart.spec.ts`, `guest-cart-storage.spec.ts`) own the exact boundaries:
 * the 999th unit, the 101st product, one named bad line. These own what only generation can claim:
 * that a rule holds after EVERY sequence of operations, not the ones someone thought of.
 *
 * The rules, each a way a guest could lose a line or send a merge the server refuses:
 *   - the cart is always valid: whole units from 1 to the cap, one line per product, at most 100;
 *   - it survives a save and a reload exactly;
 *   - reading storage is total and settles in one pass, whatever the storage holds;
 *   - merging adds up to adding one by one, which is what `POST /cart` would have done;
 *   - taking away what a merge sent leaves exactly what was added during the call.
 *
 * Seeded, like every property file here (`docs/tools/property-testing.md`): a failure is
 * reproducible, never flake.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
    MAX_GUEST_LINES,
    MAX_GUEST_LINE_QUANTITY,
    addGuestLine,
    guestCartQuantity,
    parseGuestCart,
    removeGuestLines,
    setGuestLineQuantity,
    subtractGuestLines
} from '@/modules/cart/domain';
import type { GuestCartLine } from '@/modules/cart/domain';
import { readGuestCart, writeGuestCart } from '@/modules/cart/composables/guest-cart-storage';

/**
 * One seed for the file. `endOnFailure` stops at the first shrunk counterexample, short enough to
 * paste into an ordinary `it()`.
 */
const RUN = { seed: 20_261_004, numRuns: 300, endOnFailure: true } as const;

afterEach(() => {
    localStorage.clear();
});

/**
 * A product id the contract accepts, drawn mostly from a few so lines collide and grow.
 */
const productId = () =>
    fc.oneof(
        { weight: 3, arbitrary: fc.constantFrom('a', 'b', 'c', 'd') },
        { weight: 1, arbitrary: fc.stringMatching(/^[\w-]{1,64}$/) }
    );

/**
 * One thing a guest can do to the cart, as the store exposes it.
 */
type Operation =
    | { kind: 'add'; id: string; quantity: number }
    | { kind: 'set'; id: string; quantity: number }
    | { kind: 'remove'; ids: string[] };

/**
 * A guest's action. Quantities come from past the cap on both sides, because a stepper never goes
 * there but `set` is documented to clamp.
 */
const operation = (): fc.Arbitrary<Operation> =>
    fc.oneof(
        fc.record({
            kind: fc.constant('add' as const),
            id: productId(),
            quantity: fc.integer({ min: 1, max: 1500 })
        }),
        fc.record({
            kind: fc.constant('set' as const),
            id: productId(),
            quantity: fc.double({ min: -2000, max: 2000, noNaN: true })
        }),
        fc.record({
            kind: fc.constant('remove' as const),
            ids: fc.array(productId(), { maxLength: 3 })
        })
    );

/**
 * Applies one operation the way the store does: an add the cart refuses leaves it unchanged.
 *
 * @param lines - The cart
 * @param step - What the guest did
 * @returns The cart after
 */
const apply = (lines: GuestCartLine[], step: Operation): GuestCartLine[] => {
    if (step.kind === 'add') return addGuestLine(lines, step.id, step.quantity) ?? lines;
    if (step.kind === 'set') return setGuestLineQuantity(lines, step.id, step.quantity);
    return removeGuestLines(lines, step.ids);
};

/**
 * Every cart a guest can reach: the empty one, then any run of operations.
 */
const reachableCart = () =>
    fc.array(operation(), { maxLength: 40 }).map((steps) => {
        let lines: GuestCartLine[] = [];
        for (const step of steps) lines = apply(lines, step);
        return lines;
    });

/**
 * One product added in some quantity.
 */
interface Addition {
    /** The product. */
    id: string;
    /** How many units. */
    quantity: number;
}

/**
 * A run of additions, each within `maxQuantity`, a few products at a time so lines collide.
 *
 * @param maxQuantity - The most units one addition carries
 * @param maxLength - The most additions in the run
 * @returns The arbitrary
 */
const additionsOf = (maxQuantity: number, maxLength: number) =>
    fc.array(fc.record({ id: productId(), quantity: fc.integer({ min: 1, max: maxQuantity }) }), {
        maxLength
    });

/**
 * Adds each one in order, the way the store does: an add the cart refuses changes nothing.
 *
 * @param start - The cart before
 * @param list - What the guest added
 * @returns The cart after
 */
const addAll = (start: GuestCartLine[], list: readonly Addition[]): GuestCartLine[] => {
    let lines = start;
    for (const { id, quantity } of list) lines = addGuestLine(lines, id, quantity) ?? lines;
    return lines;
};

/**
 * A cart read as units per product, so two carts compare by what they hold, not by order.
 *
 * @param lines - The cart
 * @returns Units per product id
 */
const byProduct = (lines: readonly GuestCartLine[]) =>
    new Map(lines.map((line) => [line.productId, line.quantity]));

/**
 * What every cart must satisfy, as the reasons it does not.
 *
 * @param lines - The cart to judge
 * @returns One message per broken rule; empty when the cart is valid
 */
const problemsWith = (lines: readonly GuestCartLine[]): string[] => {
    const problems: string[] = [];
    if (lines.length > MAX_GUEST_LINES) problems.push(`${lines.length} lines`);
    if (new Set(lines.map((line) => line.productId)).size !== lines.length)
        problems.push('a product on two lines');
    for (const { productId: id, quantity } of lines) {
        const whole = Number.isInteger(quantity);
        if (!whole || quantity < 1 || quantity > MAX_GUEST_LINE_QUANTITY)
            problems.push(`${id} holds ${quantity}`);
    }
    return problems;
};

describe('the cart after any run of operations', () => {
    it('is always valid: whole units from 1 to the cap, one line per product, at most 100 lines', () => {
        fc.assert(
            fc.property(reachableCart(), (lines) => {
                expect(problemsWith(lines)).toEqual([]);
            }),
            RUN
        );
    });

    it('survives being saved and read back exactly, order and all', () => {
        fc.assert(
            fc.property(reachableCart(), (lines) => {
                writeGuestCart(lines);
                expect(readGuestCart()).toEqual(lines);
            }),
            RUN
        );
    });

    it('survives serialisation as JSON text, which is all the storage keeps', () => {
        fc.assert(
            fc.property(reachableCart(), (lines) => {
                const text = JSON.stringify(lines);
                expect(parseGuestCart(JSON.parse(text))).toEqual(lines);
            }),
            RUN
        );
    });

    it('keeps a full cart full: an add for a 101st product is refused and changes nothing', () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 50 }), (quantity) => {
                const full = Array.from({ length: MAX_GUEST_LINES }, (_unused, index) => ({
                    productId: `full-${index}`,
                    quantity
                }));
                expect(addGuestLine(full, 'one-more', 1)).toBeUndefined();
            }),
            RUN
        );
    });
});

describe('reading whatever the storage holds', () => {
    it('never throws, and answers a valid cart', () => {
        fc.assert(
            fc.property(fc.jsonValue(), (stored) => {
                expect(problemsWith(parseGuestCart(stored))).toEqual([]);
            }),
            RUN
        );
    });

    it('settles in one pass: reading what was read changes nothing', () => {
        fc.assert(
            fc.property(fc.jsonValue(), (stored) => {
                const once = parseGuestCart(stored);
                const text = JSON.stringify(once);
                expect(parseGuestCart(JSON.parse(text))).toEqual(once);
            }),
            RUN
        );
    });

    it('keeps every unit a hand-edited list put in, summed per product and capped, never dropping a valid line', () => {
        const validLine = fc.record({
            productId: productId(),
            quantity: fc.integer({ min: 1, max: MAX_GUEST_LINE_QUANTITY })
        });
        fc.assert(
            fc.property(fc.array(validLine, { maxLength: 12 }), (listed) => {
                const expected = new Map<string, number>();
                for (const { productId: id, quantity } of listed)
                    expected.set(
                        id,
                        Math.min(MAX_GUEST_LINE_QUANTITY, (expected.get(id) ?? 0) + quantity)
                    );

                const read = parseGuestCart(listed);

                expect(new Map(read.map((line) => [line.productId, line.quantity]))).toEqual(
                    expected
                );
            }),
            RUN
        );
    });
});

describe('merging', () => {
    it('adds up to what adding one by one gives: per product the sum, capped, in the order first added', () => {
        fc.assert(
            fc.property(additionsOf(600, 15), (added) => {
                const oneByOne = addAll([], added);

                const model = new Map<string, number>();
                for (const { id, quantity } of added)
                    model.set(
                        id,
                        Math.min(MAX_GUEST_LINE_QUANTITY, (model.get(id) ?? 0) + quantity)
                    );
                expect(oneByOne).toEqual(
                    [...model].map(([id, quantity]) => ({ productId: id, quantity }))
                );
            }),
            RUN
        );
    });

    it('counts every unit once in the badge: the total is the sum of the lines', () => {
        fc.assert(
            fc.property(reachableCart(), (lines) => {
                let units = 0;
                for (const { quantity } of lines) units += quantity;
                expect(guestCartQuantity(lines)).toBe(units);
            }),
            RUN
        );
    });

    it('takes away exactly what was sent: nothing is left of a cart that was not touched meanwhile', () => {
        fc.assert(
            fc.property(reachableCart(), (lines) => {
                expect(subtractGuestLines(lines, lines)).toEqual([]);
            }),
            RUN
        );
    });

    it('leaves exactly what was added during the call, when no line reached the cap', () => {
        fc.assert(
            fc.property(additionsOf(100, 6), additionsOf(100, 6), (before, during) => {
                const sent = addAll([], before);
                const now = addAll(sent, during);

                const left = subtractGuestLines(now, sent);

                expect(byProduct(left)).toEqual(byProduct(addAll([], during)));
            }),
            RUN
        );
    });

    it('never leaves a line of nothing, nor one the cart did not hold', () => {
        fc.assert(
            fc.property(reachableCart(), reachableCart(), (now, sent) => {
                const left = subtractGuestLines(now, sent);

                const heldBy = new Map(now.map((line) => [line.productId, line.quantity]));
                for (const { productId: id, quantity } of left) {
                    expect(quantity).toBeGreaterThanOrEqual(1);
                    expect(quantity).toBeLessThanOrEqual(heldBy.get(id) ?? 0);
                }
            }),
            RUN
        );
    });
});

describe('removing', () => {
    it('keeps every other line as it was, in its place, and removing twice is removing once', () => {
        fc.assert(
            fc.property(reachableCart(), fc.array(productId(), { maxLength: 4 }), (lines, ids) => {
                const removed = removeGuestLines(lines, ids);

                expect(removed).toEqual(lines.filter((line) => !ids.includes(line.productId)));
                expect(removeGuestLines(removed, ids)).toEqual(removed);
            }),
            RUN
        );
    });
});
