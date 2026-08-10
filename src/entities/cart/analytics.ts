/*
 * Analytics payload for adding or updating one cart line.
 */
export interface ICartItemQuantityPayload {
    [key: string]: unknown;
    product_id: string;
    quantity: number;
}

/*
 * Analytics payload for removing one cart line.
 */
export interface ICartItemRemovedPayload {
    [key: string]: unknown;
    product_id: string;
}

/*
 * Build the payload used by `cart_item_added`.
 *
 * @param productId - Product identifier.
 * @param quantity - Added quantity.
 * @returns Analytics payload with canonical property names.
 */
export const buildCartItemAddedPayload = (
    productId: string,
    quantity: number
): ICartItemQuantityPayload => ({
    product_id: productId,
    quantity
});

/*
 * Build the payload used by `cart_item_updated`.
 *
 * @param productId - Product identifier.
 * @param quantity - New quantity.
 * @returns Analytics payload with canonical property names.
 */
export const buildCartItemUpdatedPayload = (
    productId: string,
    quantity: number
): ICartItemQuantityPayload => ({
    product_id: productId,
    quantity
});

/*
 * Build the payload used by `cart_item_removed`.
 *
 * @param productId - Product identifier.
 * @returns Analytics payload with canonical property names.
 */
export const buildCartItemRemovedPayload = (productId: string): ICartItemRemovedPayload => ({
    product_id: productId
});
