/**
 * @module
 * Classifies a "start paying" rejection into one of the API's documented shapes. Pure: reads the
 * envelope's `errors[0]`, returns a verdict, produces no copy — the view decides what each
 * verdict says and does. Same shape as `cart/domain/checkout-errors.ts`, scoped to the one
 * refusal worth a dedicated response here.
 */

/**
 * One line the payment refused for having no sellable product behind it, as
 * `ORDER_PRODUCT_UNAVAILABLE`'s `details.lines` carries it. `title` always present — read off the
 * order's own frozen line snapshot, never the live catalogue, so there is nothing to lose it.
 */
export interface UnavailableOrderLine {
    productId: string;
    title: string;
}

/**
 * What a "start paying" rejection means for the view, narrowed from the wire error code.
 *
 * `other` covers every refusal without a dedicated UI response (`PAYMENT_ORDER_NOT_PAYABLE`, a
 * decline, a transport failure) — the generic toast is already the documented right answer.
 */
export type PaymentErrorVerdict =
    { kind: 'product-unavailable'; lines: UnavailableOrderLine[] } | { kind: 'other' };

/**
 * Narrows an unknown value to an `UnavailableOrderLine`.
 *
 * @param value - One entry of `details.lines`, still unknown.
 * @returns The line, or `undefined` when the shape does not match.
 */
const asUnavailableLine = (value: unknown): UnavailableOrderLine | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    const { productId, title } = value as Record<string, unknown>;
    if (typeof productId !== 'string' || typeof title !== 'string') return undefined;
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
 * Classifies a "start paying" rejection.
 *
 * @param error - The rejected value `paymentsStore.payForOrder()` threw.
 * @returns The verdict the view renders from.
 */
export const classifyPaymentError = (error: unknown): PaymentErrorVerdict => {
    const item = firstErrorItem(error);
    if (item?.code === 'ORDER_PRODUCT_UNAVAILABLE') {
        const rawLines = (item.details as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(rawLines)
            ? rawLines.map((line) => asUnavailableLine(line)).filter((line) => line !== undefined)
            : [];
        return { kind: 'product-unavailable', lines };
    }
    return { kind: 'other' };
};
