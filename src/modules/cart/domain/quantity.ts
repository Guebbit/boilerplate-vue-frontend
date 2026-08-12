/**
 * Cart line quantity rules. Pure: no Vue, no store.
 * A line cannot reach zero by stepping — zero is a removal, which is a different call.
 * See `docs/theory/domain-layer.md`.
 */

/** The smallest a line may be. Below this, remove the line instead of updating it. */
export const MIN_LINE_QUANTITY = 1;

/**
 * Drives the stepper's `disabled` state.
 * @param quantity - the line's current quantity
 * @returns whether a decrement is allowed
 */
export const canDecrement = (quantity: number): boolean => quantity > MIN_LINE_QUANTITY;

/**
 * The quantity a step lands on, clamped to the floor.
 * Clamped rather than trusted: a double click can outrun the disabled guard.
 * @param quantity - the line's current quantity
 * @param step - how far to move, positive or negative
 * @returns the new quantity, never below {@link MIN_LINE_QUANTITY}
 */
export const steppedQuantity = (quantity: number, step: number): number =>
    Math.max(MIN_LINE_QUANTITY, quantity + step);
