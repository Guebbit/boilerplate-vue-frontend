/**
 * @module
 * Cart quantity rules — `src/modules/cart/domain/quantity.ts`.
 *
 * No `mount`, no Pinia, no HTTP. The rules take their inputs as arguments and hand back a verdict,
 * so these are statements about the rule rather than about a `disabled` attribute on `SignedInCart.vue`.
 *
 * The floor is asserted through the clamp rather than through a predicate: `SignedInCart.vue` compares
 * against `MIN_LINE_QUANTITY` inline, and `steppedQuantity` is what has to hold when a double click
 * outruns that guard.
 */

import { describe, it, expect } from 'vitest';
import { clampToAvailable, steppedQuantity } from '../domain';

describe('steppedQuantity', () => {
    it('steps up', () => {
        expect(steppedQuantity(2, 1)).toBe(3);
    });

    it('steps down', () => {
        expect(steppedQuantity(3, -1)).toBe(2);
    });

    /**
     * A double click can outrun the disabled guard, and `quantity: 0` violates the contract.
     * Asserted against the literal `openapi.yaml` `minimum: 1`, not the module's own
     * `MIN_LINE_QUANTITY` — the constant drifting from the contract must fail this test.
     */
    it('clamps at the floor instead of reaching zero', () => {
        expect(steppedQuantity(1, -1)).toBe(1);
    });

    it('clamps however far the step overshoots', () => {
        expect(steppedQuantity(2, -50)).toBe(1);
    });

    /* Defensive: a line should never be below the floor, but if one is, it comes back up to it. */
    it('lifts a line that is already below the floor', () => {
        expect(steppedQuantity(0, -1)).toBe(1);
    });
});

describe('steppedQuantity with what can be bought', () => {
    it('stops a raise at the number', () => {
        expect(steppedQuantity(2, 1, 3)).toBe(3);
        expect(steppedQuantity(3, 1, 3)).toBe(3);
    });

    it('never raises a line already above the number, and still lowers it', () => {
        expect(steppedQuantity(5, 1, 3)).toBe(5);
        expect(steppedQuantity(5, -1, 3)).toBe(4);
    });

    it('raises freely when there is no limit', () => {
        expect(steppedQuantity(5, 1)).toBe(6);
    });
});

describe('clampToAvailable', () => {
    it.each([
        { wanted: 5, held: 0, available: undefined, quantity: 5, code: undefined },
        { wanted: 3, held: 0, available: 5, quantity: 3, code: undefined },
        { wanted: 6, held: 0, available: 5, quantity: 5, code: 'MERCHANDISE_NOT_ENOUGH_STOCK' },
        { wanted: 6, held: 8, available: 5, quantity: 6, code: undefined },
        { wanted: 9, held: 8, available: 5, quantity: 8, code: 'MERCHANDISE_NOT_ENOUGH_STOCK' },
        { wanted: 2, held: 0, available: 0, quantity: 0, code: 'MERCHANDISE_OUT_OF_STOCK' },
        { wanted: 9, held: 8, available: 0, quantity: 8, code: 'MERCHANDISE_OUT_OF_STOCK' }
    ] as const)(
        'holds $wanted at $quantity with $held held and $available buyable',
        ({ wanted, held, available, quantity, code }) => {
            expect(clampToAvailable(wanted, held, available)).toEqual({
                quantity,
                ...(code ? { code } : {})
            });
        }
    );
});
