/**
 * Test-only door into the products store, which the `products` barrel no longer publishes.
 * Specs seed the dictionary and stub the batched read through here instead of importing the store
 * from a sibling module.
 */
import { vi } from 'vitest';
import type { Product } from '@types';
import { useProductsStore } from '@/modules/products/store';

/**
 * Puts products into the dictionary, as if a read had already returned them.
 *
 * @param products - The records to hold.
 */
export const seedProducts = (...products: Product[]): void => {
    const store = useProductsStore();
    for (const product of products) store.addProduct(product);
};

/**
 * Spies on the batched read by id. Chain `.mockResolvedValue`, `.mockRejectedValue` or
 * `.mockImplementation` to say what the read answers.
 *
 * @returns The spy on `fetchProductsByIds`.
 */
export const spyOnProductReads = () => vi.spyOn(useProductsStore(), 'fetchProductsByIds');
