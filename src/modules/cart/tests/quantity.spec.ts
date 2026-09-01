/**
 * @module
 * Cart quantity rules — `src/modules/cart/domain/quantity.ts`.
 *
 * No `mount`, no Pinia, no HTTP. The rules take their inputs as arguments and hand back a verdict,
 * so these are statements about the rule rather than about a `disabled` attribute on `Cart.vue`.
 *
 * The floor is asserted through the clamp rather than through a predicate: `Cart.vue` compares
 * against `MIN_LINE_QUANTITY` inline, and `steppedQuantity` is what has to hold when a double click
 * outruns that guard.
 */

import { describe, it, expect } from 'vitest';
import { steppedQuantity } from '@/modules/cart/domain';

describe('steppedQuantity', () => {
    it('steps up', () => {
        expect(steppedQuantity(2, 1)).toBe(3);
    });

    it('steps down', () => {
        expect(steppedQuantity(3, -1)).toBe(2);
    });

    // A double click can outrun the disabled guard, and `quantity: 0` violates the contract.
    // Asserted against the literal `openapi.yaml` `minimum: 1`, not the module's own
    // `MIN_LINE_QUANTITY` — the constant drifting from the contract must fail this test.
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
