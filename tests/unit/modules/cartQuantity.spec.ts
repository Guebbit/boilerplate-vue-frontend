/**
 * Cart quantity rules — `src/modules/cart/domain/quantity.ts`.
 *
 * No `mount`, no Pinia, no MSW. The rules take their inputs as arguments and hand back a verdict,
 * so these are statements about the rule rather than about a `disabled` attribute on `Cart.vue`.
 */

import { describe, it, expect } from 'vitest';
import { canDecrement, steppedQuantity, MIN_LINE_QUANTITY } from '@/modules/cart/domain';

describe('canDecrement', () => {
    it('refuses at the floor — removal is a different action', () => {
        expect(canDecrement(MIN_LINE_QUANTITY)).toBe(false);
    });

    it('allows above the floor', () => {
        expect(canDecrement(2)).toBe(true);
    });

    /* Defensive: a line should never be below the floor, but if one is, the answer is still no. */
    it('refuses below the floor', () => {
        expect(canDecrement(0)).toBe(false);
    });
});

describe('steppedQuantity', () => {
    it('steps up', () => {
        expect(steppedQuantity(2, 1)).toBe(3);
    });

    it('steps down', () => {
        expect(steppedQuantity(3, -1)).toBe(2);
    });

    // A double click can outrun the disabled guard, and `quantity: 0` violates the contract.
    it('clamps at the floor instead of reaching zero', () => {
        expect(steppedQuantity(1, -1)).toBe(MIN_LINE_QUANTITY);
    });

    it('clamps however far the step overshoots', () => {
        expect(steppedQuantity(2, -50)).toBe(MIN_LINE_QUANTITY);
    });
});
