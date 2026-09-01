/**
 * @module
 * Classifies a checkout rejection into one of the API's four documented shapes
 * (`docs/modules/cart-checkout.md` §"The four refusals, and why they are shaped differently").
 * Pure: reads the envelope's `errors[0]`, returns a verdict, produces no copy — the view decides
 * what each verdict says and does.
 */

/** One line the checkout could not honour, as `CART_INSUFFICIENT_STOCK`'s `details.lines` carries it. */
export interface CheckoutShortfallLine {
    productId: string;
    title: string;
    requested: number;
    available: number;
}

/**
 * What a checkout rejection means for the view, narrowed from the wire error code.
 *
 * `other` covers every refusal without a dedicated UI response (`CART_EMPTY`,
 * `CART_PRODUCT_UNAVAILABLE`, `CART_SHIPPING_METHOD_NOT_FOUND`, a transport failure) — the
 * generic toast is already the documented right answer for those.
 */
export type CheckoutErrorVerdict =
    | { kind: 'cart-changed' }
    | { kind: 'insufficient-stock'; lines: CheckoutShortfallLine[] }
    | { kind: 'address-not-found' }
    | { kind: 'other' };

/**
 * Narrows an unknown value to a `CheckoutShortfallLine` — the details payload crosses a wire
 * boundary, so nothing about its shape is trusted beyond what is checked here.
 *
 * @param value - One entry of `details.lines`, still unknown.
 * @returns The line, or `undefined` when the shape does not match.
 */
const asShortfallLine = (value: unknown): CheckoutShortfallLine | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    const { productId, title, requested, available } = value as Record<string, unknown>;
    if (
        typeof productId !== 'string' ||
        typeof title !== 'string' ||
        typeof requested !== 'number' ||
        typeof available !== 'number'
    )
        return undefined;
    return { productId, title, requested, available };
};

/**
 * Reads `error.errors[0]` without trusting its shape — the same duck-typing
 * `infrastructure/utils/errors.ts` uses for `status`, applied to the sibling field.
 *
 * @param error - The rejected value a `.catch` caught.
 * @returns The first structured error item, or `undefined` when the shape does not match.
 */
const firstErrorItem = (error: unknown): { code?: unknown; details?: unknown } | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;
    const items = (error as { errors?: unknown }).errors;
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const [item] = items;
    return typeof item === 'object' && item !== null ? item : undefined;
};

/**
 * Classifies a checkout rejection.
 *
 * @param error - The rejected value `cartStore.checkout()` threw.
 * @returns The verdict the view renders from.
 */
export const classifyCheckoutError = (error: unknown): CheckoutErrorVerdict => {
    const item = firstErrorItem(error);
    if (item?.code === 'CART_CHANGED') return { kind: 'cart-changed' };
    if (item?.code === 'CART_ADDRESS_NOT_FOUND') return { kind: 'address-not-found' };
    if (item?.code === 'CART_INSUFFICIENT_STOCK') {
        const rawLines = (item.details as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(rawLines)
            ? rawLines.map((line) => asShortfallLine(line)).filter((line) => line !== undefined)
            : [];
        return { kind: 'insufficient-stock', lines };
    }
    return { kind: 'other' };
};
