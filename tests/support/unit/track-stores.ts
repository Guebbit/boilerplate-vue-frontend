/**
 * Tracks the cart stores a spec creates so they can all be disposed after each case. Kept apart
 * from `cart-interleave.ts` because that one imports the generated client, which a spec that
 * mocks `@api` partially cannot afford.
 */
import { useCartStore } from '@/modules/cart/store';

/**
 * The cart store, as a type.
 */
type CartStore = ReturnType<typeof useCartStore>;

/**
 * Creates cart stores for a spec and disposes them all afterwards, so the `storage` listener each
 * one adds to `globalThis` does not outlive its case.
 *
 * @returns `fresh` makes a tracked store, `disposeAll` (call it from `afterEach`) disposes them
 */
export const trackStores = () => {
    let created: CartStore[] = [];
    return {
        fresh: () => {
            const store = useCartStore();
            created.push(store);
            return store;
        },
        disposeAll: () => {
            for (const store of created) store.$dispose();
            created = [];
        }
    };
};
