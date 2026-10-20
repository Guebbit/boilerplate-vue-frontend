/**
 * @module
 * Classifies a checkout rejection into one of the API's documented shapes
 * (`docs/modules/cart-checkout.md` §"The eight refusals, and why they are shaped differently").
 * Pure: reads the envelope's `errors[0]`, returns a verdict, produces no copy — the view decides
 * what each verdict says and does.
 */

import { ERROR_CODES } from '@api/error-codes';
import type { LineAvailability } from '@types';
import type { ExpectedTotal } from './expected-total';

/**
 * Why a line was refused under `CART_INSUFFICIENT_STOCK`: fewer left, none left, or off sale.
 * Never `removed`, which is `CART_PRODUCT_UNAVAILABLE`'s.
 */
export type ShortfallAvailability = Extract<
    LineAvailability,
    'insufficient_stock' | 'out_of_stock' | 'unavailable'
>;

/**
 * One line of a checkout shortfall, as `CART_INSUFFICIENT_STOCK`'s `details.lines` carries it:
 * which product, how much was asked for, and why it was refused. The number left is not sent —
 * exact stock is for stock readers, and a shopper is not one.
 */
export interface CheckoutShortfallLine {
    productId: string;
    title: string;
    requested: number;
    availability: ShortfallAvailability;
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
 * `cart-empty` and `in-flight` are what a LOST answer leads to: the order exists, or is being made,
 * and the page still shows the basket. `server-error` is a bare 500: it may or may not have written
 * an order, so only a fresh read of the cart can tell. `other` covers every refusal without a
 * dedicated UI response (`CART_SHIPPING_METHOD_NOT_FOUND`, a transport failure) — the generic
 * toast is already the documented right answer for those.
 */
export type CheckoutErrorVerdict =
    | { kind: 'cart-changed' }
    | {
          kind: 'total-changed';
          expected: ExpectedTotal | undefined;
          actual: ExpectedTotal | undefined;
      }
    | { kind: 'insufficient-stock'; lines: CheckoutShortfallLine[] }
    | { kind: 'address-not-found' }
    | { kind: 'billing-address-required' }
    | { kind: 'shipping-method-weight' }
    | { kind: 'ship-to-country-not-supported' }
    | { kind: 'product-unavailable'; lines: UnavailableCartLine[] }
    | { kind: 'open-order-limit'; orderIds: string[] }
    | { kind: 'purchase-hold' }
    | { kind: 'cart-empty' }
    | { kind: 'in-flight' }
    | { kind: 'server-error' }
    | { kind: 'other' };

/**
 * The `availability` values a shortfall line may carry.
 */
const SHORTFALL_AVAILABILITIES: ReadonlySet<unknown> = new Set([
    'insufficient_stock',
    'out_of_stock',
    'unavailable'
]);

/**
 * Narrows an unknown value to a shortfall line's `availability`.
 *
 * @param value - The field, still unknown.
 * @returns Whether it is one of the three refusals a shortfall can name.
 */
const isShortfallAvailability = (value: unknown): value is ShortfallAvailability =>
    SHORTFALL_AVAILABILITIES.has(value);

/**
 * Narrows an unknown value to a `CheckoutShortfallLine` — the details payload crosses a wire
 * boundary, so nothing about its shape is trusted beyond what is checked here.
 *
 * @param value - One entry of `details.lines`, still unknown.
 * @returns The line, or `undefined` when the shape does not match.
 */
const asShortfallLine = (value: unknown): CheckoutShortfallLine | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    const { productId, title, requested, availability } = value as Record<string, unknown>;
    if (typeof productId !== 'string' || typeof title !== 'string' || typeof requested !== 'number')
        return undefined;
    if (!isShortfallAvailability(availability)) return undefined;
    return { productId, title, requested, availability };
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
 * Narrows an unknown value to a money amount (minor units plus currency).
 *
 * @param value - One side of `CART_TOTAL_CHANGED`'s `details`, still unknown.
 * @returns The amount, or `undefined` when the shape does not match.
 */
const asMoney = (value: unknown): ExpectedTotal | undefined => {
    if (typeof value !== 'object' || value === null) return undefined;
    const { amount, currency } = value as Record<string, unknown>;
    if (typeof amount !== 'number' || typeof currency !== 'string') return undefined;
    return { amount, currency };
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
    // `Array.isArray` narrows its argument to `any[]` in the standard lib typings — a stdlib
    // quirk, not a real `any` — so `items` is re-read through an `unknown` cast rather than
    // destructured straight off the narrowed array.
    if (!Array.isArray(items) || items.length === 0) return undefined;
    const item: unknown = (items as unknown[])[0];
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
    if (item?.code === ERROR_CODES.CART_CHANGED) return { kind: 'cart-changed' };
    if (item?.code === ERROR_CODES.CART_TOTAL_CHANGED) {
        const details = item.details as { expected?: unknown; actual?: unknown } | undefined;
        return {
            kind: 'total-changed',
            expected: asMoney(details?.expected),
            actual: asMoney(details?.actual)
        };
    }
    if (item?.code === ERROR_CODES.CART_ADDRESS_NOT_FOUND) return { kind: 'address-not-found' };
    if (item?.code === ERROR_CODES.CART_BILLING_ADDRESS_REQUIRED)
        return { kind: 'billing-address-required' };
    if (item?.code === ERROR_CODES.CART_SHIPPING_METHOD_WEIGHT) {
        return { kind: 'shipping-method-weight' };
    }
    if (item?.code === ERROR_CODES.CART_SHIP_TO_COUNTRY_NOT_SUPPORTED) {
        return { kind: 'ship-to-country-not-supported' };
    }
    if (item?.code === ERROR_CODES.CART_INSUFFICIENT_STOCK) {
        const rawLines = (item.details as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(rawLines)
            ? rawLines.map((line) => asShortfallLine(line)).filter((line) => line !== undefined)
            : [];
        return { kind: 'insufficient-stock', lines };
    }
    if (item?.code === ERROR_CODES.CART_PRODUCT_UNAVAILABLE) {
        const rawLines = (item.details as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(rawLines)
            ? rawLines.map((line) => asUnavailableLine(line)).filter((line) => line !== undefined)
            : [];
        return { kind: 'product-unavailable', lines };
    }
    if (item?.code === ERROR_CODES.CART_OPEN_ORDER_LIMIT) {
        const rawIds = (item.details as { orderIds?: unknown } | undefined)?.orderIds;
        const orderIds = Array.isArray(rawIds)
            ? rawIds.filter((id): id is string => typeof id === 'string')
            : [];
        return { kind: 'open-order-limit', orderIds };
    }
    // The reason, the date and the note are the buyer's own record's to show (`PurchaseHoldNotice`).
    if (item?.code === ERROR_CODES.CART_PURCHASE_HOLD) return { kind: 'purchase-hold' };
    if (item?.code === ERROR_CODES.CART_EMPTY) return { kind: 'cart-empty' };
    if (item?.code === ERROR_CODES.IDEMPOTENCY_IN_FLIGHT) return { kind: 'in-flight' };
    if ((error as { status?: unknown } | null | undefined)?.status === 500)
        return { kind: 'server-error' };
    return { kind: 'other' };
};
