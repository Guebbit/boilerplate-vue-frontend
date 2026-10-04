/**
 * @module
 * The guest cart's rules: a plain list of `{ productId, quantity }` lines a signed-out visitor
 * builds in their own browser. Pure: no storage, no store. The limits mirror what
 * `POST /cart/merge` accepts, so a guest cart can always be sent in one call.
 *
 * A line already there grows by the quantity added, the same rule `POST /cart` applies server-side,
 * so merging adds up to what adding one by one would have.
 */
/**
 * One line of a guest cart.
 */
export interface GuestCartLine {
    /**
     * The product's id.
     */
    productId: string;
    /**
     * How many of it, a whole number from 1 to {@link MAX_GUEST_LINE_QUANTITY}.
     */
    quantity: number;
}

/**
 * The most units one line may hold: the contract's own cap on a merged line.
 */
export const MAX_GUEST_LINE_QUANTITY = 999;

/**
 * The most distinct products a guest cart may hold: the contract's cap on lines per merge call.
 */
export const MAX_GUEST_LINES = 100;

/**
 * The shape of a product id in the contract: 1 to 64 letters, digits, `_` or `-`.
 */
const PRODUCT_ID_PATTERN = /^[\w-]{1,64}$/;

/**
 * Reads one stored value as a line, checked against the shape the merge call will send, so a line
 * this accepts is a line the server will not reject for its shape. Hand-written rather than a
 * schema: this file loads with the app shell, and a schema library would load with it.
 *
 * @param candidate - Anything the storage held in a list slot.
 * @returns The line, or `undefined` when it is not one.
 */
const asGuestLine = (candidate: unknown): GuestCartLine | undefined => {
    if (typeof candidate !== 'object' || candidate === null) return undefined;
    const { productId, quantity } = candidate as Record<string, unknown>;
    const valid =
        typeof productId === 'string' &&
        PRODUCT_ID_PATTERN.test(productId) &&
        typeof quantity === 'number' &&
        Number.isInteger(quantity) &&
        quantity >= 1 &&
        quantity <= MAX_GUEST_LINE_QUANTITY;
    return valid ? { productId, quantity } : undefined;
};

/**
 * Adds units of a product, growing its line when it has one.
 *
 * A line stops at {@link MAX_GUEST_LINE_QUANTITY}: asking for more simply fills it. A product with
 * no line yet is refused once {@link MAX_GUEST_LINES} products are in.
 *
 * @param lines - The current cart.
 * @param productId - The product to add.
 * @param quantity - How many units, at least 1.
 * @returns The new cart, or `undefined` when the cart is full of other products.
 */
export const addGuestLine = (
    lines: readonly GuestCartLine[],
    productId: string,
    quantity: number
): GuestCartLine[] | undefined => {
    const existing = lines.find((line) => line.productId === productId);
    if (!existing && lines.length >= MAX_GUEST_LINES) return undefined;
    const grown = Math.min(MAX_GUEST_LINE_QUANTITY, (existing?.quantity ?? 0) + quantity);
    return existing
        ? lines.map((line) => (line === existing ? { productId, quantity: grown } : line))
        : [...lines, { productId, quantity: grown }];
};

/**
 * Sets a line's exact quantity, clamped into the allowed range. A product with no line is ignored.
 *
 * @param lines - The current cart.
 * @param productId - The line to set.
 * @param quantity - The wanted number of units.
 * @returns The new cart.
 */
export const setGuestLineQuantity = (
    lines: readonly GuestCartLine[],
    productId: string,
    quantity: number
): GuestCartLine[] => {
    const clamped = Math.min(MAX_GUEST_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
    return lines.map((line) =>
        line.productId === productId ? { productId, quantity: clamped } : line
    );
};

/**
 * Drops the lines of some products.
 *
 * @param lines - The current cart.
 * @param productIds - The products whose lines go.
 * @returns The cart without them.
 */
export const removeGuestLines = (
    lines: readonly GuestCartLine[],
    productIds: readonly string[]
): GuestCartLine[] => lines.filter((line) => !productIds.includes(line.productId));

/**
 * How many units the cart holds in all: what the app bar's badge shows.
 *
 * @param lines - The cart.
 * @returns The sum of every line's quantity.
 */
export const guestCartQuantity = (lines: readonly GuestCartLine[]): number =>
    lines.reduce((total, line) => total + line.quantity, 0);

/**
 * Reads a guest cart back from whatever storage held, keeping what is valid and dropping the rest.
 * Storage is the visitor's to edit and another build's to have written, so nothing in it is
 * trusted: a line that fails the shape is dropped, the same product twice is folded into one line,
 * and the result never passes the caps.
 *
 * @param stored - The parsed storage value, of any type.
 * @returns A valid cart; empty when nothing usable was stored.
 */
export const parseGuestCart = (stored: unknown): GuestCartLine[] => {
    if (!Array.isArray(stored)) return [];
    let lines: GuestCartLine[] = [];
    for (const candidate of stored as unknown[]) {
        const line = asGuestLine(candidate);
        if (line) lines = addGuestLine(lines, line.productId, line.quantity) ?? lines;
    }
    return lines;
};
