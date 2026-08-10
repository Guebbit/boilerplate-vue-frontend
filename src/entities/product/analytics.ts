/*
 * Payload for the `product_viewed` analytics event.
 */
export interface IProductViewedPayload {
    [key: string]: unknown;
    product_id: string;
    product_name?: string;
}

/*
 * Payload for the `products_searched` analytics event.
 */
export interface IProductSearchedPayload {
    [key: string]: unknown;
    query: string;
}

/*
 * Build a product-view payload.
 *
 * @param productId - Viewed product id.
 * @param productName - Optional human-readable product name.
 * @returns Canonical product-view analytics payload.
 */
export const buildProductViewedPayload = (
    productId: string,
    productName?: string
): IProductViewedPayload => ({
    product_id: productId,
    product_name: productName
});

/*
 * Build a product-search payload.
 *
 * @param query - Raw search query.
 * @returns Canonical product-search analytics payload.
 */
export const buildProductSearchedPayload = (query: string): IProductSearchedPayload => ({
    query
});
