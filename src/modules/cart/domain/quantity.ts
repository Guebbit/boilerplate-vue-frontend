/**
 * @module
 * Cart line quantity rules. Pure: no Vue, no store.
 * A line cannot reach zero by stepping — zero is a removal, which is a different call.
 * See `docs/theory/domain-layer.md`.
 */
import type { CartWarningCode } from '@types';

/**
 * The smallest a line may be. Below this, remove the line instead of updating it.
 */
export const MIN_LINE_QUANTITY = 1;

/**
 * How far a write may go: `wanted` units, but no more than can be bought. A line already above the
 * number is never lowered by a write that did not ask for it, so lowering stays allowed and raising
 * stops at what the line holds. The guest cart's own copy of the server's rule for the signed-in
 * cart (`MERCHANDISE_NOT_ENOUGH_STOCK` / `MERCHANDISE_OUT_OF_STOCK`, Shopify's cart warnings).
 *
 * @param wanted - what the write asks the line to hold
 * @param held - what the line holds now, `0` for none
 * @param quantityAvailable - how many can be bought now; absent is no limit
 * @returns what the line holds after the write, and the warning code when that is less than `wanted`
 */
export const clampToAvailable = (
    wanted: number,
    held: number,
    quantityAvailable: number | undefined
): { quantity: number; code?: CartWarningCode } => {
    if (quantityAvailable === undefined) return { quantity: wanted };
    const quantity = Math.min(wanted, Math.max(held, quantityAvailable));
    if (quantity === wanted) return { quantity };
    return {
        quantity,
        code: quantityAvailable === 0 ? 'MERCHANDISE_OUT_OF_STOCK' : 'MERCHANDISE_NOT_ENOUGH_STOCK'
    };
};

/**
 * The quantity a step lands on, clamped to the floor and, when raising, to what can be bought.
 * Clamped rather than trusted: a double click can outrun the disabled guard. A line already above
 * the number is never raised, and lowering it is always allowed.
 * @param quantity - the line's current quantity
 * @param step - how far to move, positive or negative
 * @param quantityAvailable - how many can be bought now; absent is no limit
 * @returns the new quantity, never below {@link MIN_LINE_QUANTITY}
 */
export const steppedQuantity = (
    quantity: number,
    step: number,
    quantityAvailable?: number
): number => {
    const next = quantity + step;
    const capped =
        step > 0 && quantityAvailable !== undefined
            ? Math.min(next, Math.max(quantity, quantityAvailable))
            : next;
    return Math.max(MIN_LINE_QUANTITY, capped);
};
