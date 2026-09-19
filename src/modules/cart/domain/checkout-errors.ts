/**
 * @module
 * Classifies a checkout rejection into one of the API's four documented shapes
 * (`docs/modules/cart-checkout.md` §"The four refusals, and why they are shaped differently").
 * Pure: reads the envelope's `errors[0]`, returns a verdict, produces no copy — the view decides
 * what each verdict says and does.
 */

/** One line the checkout could not honour, as `CART_INSUFFICIENT_STOCK`'s `details.lines` carries it. */

/**
 * One line of a checkout shortfall: what was wanted, and what the stock can actually cover.
 */
export interface CheckoutShortfallLine {
    productId: string;
    title: string;
    requested: number;
    available: number;
}

/**
 * One line the checkout refused for having no sellable product behind it, as
 * `CART_PRODUCT_UNAVAILABLE`'s `details.lines` carries it. `title` is absent for a hard-deleted
 * product — there is nothing left to read one off.
 */
export interface UnavailableCartLine {
    productId: string;
    title?: string;
}

/**
 * What a checkout rejection means for the view, narrowed from the wire error code.
 *
 * `other` covers every refusal without a dedicated UI response (`CART_EMPTY`,
 * `CART_SHIPPING_METHOD_NOT_FOUND`, a transport failure) — the generic toast is already the
 * documented right answer for those.
 */
export type CheckoutErrorVerdict =
    | { kind: 'cart-changed' }
    | { kind: 'insufficient-stock'; lines: CheckoutShortfallLine[] }
    | { kind: 'address-not-found' }
    | { kind: 'shipping-method-weight' }
    | { kind: 'product-unavailable'; lines: UnavailableCartLine[] }
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
 * Narrows an unknown value to an `UnavailableCartLine` — `title` is optional on the wire (a
 * hard-deleted product has none), unlike every field of `CheckoutShortfallLine`.
 *
 * @param value - One entry of `details.lines`, still unknown.
 * @returns The line, or `undefined` when the shape does not match.
 */
const asUnavailableLine = (value: unknown): UnavailableCartLine | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    const { productId, title } = value as Record<string, unknown>;
    if (typeof productId !== 'string') return undefined;
    if (title !== undefined && typeof title !== 'string') return undefined;
    return { productId, title };
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
    if (item?.code === 'CART_SHIPPING_METHOD_WEIGHT') return { kind: 'shipping-method-weight' };
    if (item?.code === 'CART_INSUFFICIENT_STOCK') {
        const rawLines = (item.details as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(rawLines)
            ? rawLines.map((line) => asShortfallLine(line)).filter((line) => line !== undefined)
            : [];
        return { kind: 'insufficient-stock', lines };
    }
    if (item?.code === 'CART_PRODUCT_UNAVAILABLE') {
        const rawLines = (item.details as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(rawLines)
            ? rawLines.map((line) => asUnavailableLine(line)).filter((line) => line !== undefined)
            : [];
        return { kind: 'product-unavailable', lines };
    }
    return { kind: 'other' };
};
