/**
 * Typed factories and small helpers for the specs that interleave cart answers by hand.
 *
 * A cart is built from its lines, so two carts in one test differ only by what the test changed,
 * and every total follows from the lines: a spec that asserts "this is the cart the server last
 * answered" compares whole carts, never a hand-copied number.
 */
import type { CartResponse } from '@types';

/**
 * The price every fixture line carries, so a total is `units * UNIT_PRICE`.
 */
export const UNIT_PRICE = 10;

/**
 * The shipping a priced cart offers: two methods, one needing an address.
 */
const SHIPPING_OPTIONS: CartResponse['shipping']['options'] = [
    { id: 'standard', price: 5, requiresAddress: true, tracked: false },
    { id: 'pickup', price: 0, requiresAddress: false, tracked: false }
];

/**
 * A valid cart as `GET /cart` answers it, whose summary agrees with its lines.
 *
 * @param lines - `[productId, quantity]` pairs, in the order the cart lists them
 * @param selected - The shipping method the cart plans to ship by, or `null` for none
 * @param short - Ids of the lines the server flags `insufficientStock`
 * @returns A `CartResponse` that parses against the generated schema
 */
export const aCart = (
    lines: [string, number][],
    selected: string | null = null,
    short: readonly string[] = []
): CartResponse => {
    const totalQuantity = lines.reduce((sum, [, quantity]) => sum + quantity, 0);
    const shippingCost = selected === 'standard' ? 5 : 0;
    return {
        items: lines.map(([productId, quantity]) => ({
            productId,
            quantity,
            insufficientStock: short.includes(productId)
        })),
        summary: {
            itemsCount: lines.length,
            totalQuantity,
            itemsTotal: totalQuantity * UNIT_PRICE,
            shippingCost,
            totalPrice: totalQuantity * UNIT_PRICE + shippingCost,
            currency: 'EUR'
        },
        shipping: {
            required: lines.length > 0,
            selected,
            options: lines.length > 0 ? SHIPPING_OPTIONS : []
        }
    };
};

/**
 * What a generated client function resolves with, so a held answer is typed by the call it answers.
 */
export type Answer<TCall extends (...parameters: never[]) => Promise<unknown>> = Awaited<
    ReturnType<TCall>
>;

/**
 * A success envelope as the API answers, around the data a test needs. The app reads only `data`;
 * the rest is what the generated client's types promise.
 *
 * @param data - The answer's payload
 * @returns The envelope
 */
export const answered = <TData>(data: TData) => ({
    success: true as const,
    status: 200,
    message: 'OK',
    data
});

/**
 * One answer the test settles by hand: the promise a mocked call returns, and the two ways to end it.
 */
export interface Gate<T> {
    /** What the mocked call returns. */
    promise: Promise<T>;
    /** Answers the call. */
    resolve: (value: T) => void;
    /** Fails the call. */
    reject: (reason: unknown) => void;
}

/**
 * A call whose answer the test holds back, to deliver answers in an order the network might.
 *
 * @returns The pending promise and its settlers
 */
export const gate = <T>(): Gate<T> => Promise.withResolvers<T>();

/**
 * The reject envelope the app's HTTP layer throws for an answered failure, never an `Error`.
 *
 * @param status - The HTTP status the server answered with
 * @param code - The stable error code in `errors[0].code`
 * @returns The rejection value
 */
export const apiRejection = (status: number, code: string) => ({
    success: false,
    status,
    message: code,
    errors: [{ code, message: code }]
});

/**
 * What a request that never got an answer rejects with: no `status` at all.
 *
 * @returns The rejection value
 */
export const lostAnswer = () => new Error('Network Error');
