import { describe, it, expect } from 'vitest';
import { useProfileStore } from '@/stores/profile.ts';
import { useProductsStore } from '@/stores/products.ts';
import { useCartStore } from '@/stores/cart.ts';
import { useOrdersStore } from '@/stores/orders.ts';
import { useUsersStore } from '@/stores/users.ts';

describe('fake API integration with stores', () => {
    it('authenticates and fetches profile', async () => {
        const profileStore = useProfileStore();
        await profileStore.login('root@root.it', 'RootRoot_123');
        expect(profileStore.accessToken).toBeTruthy();
        expect(profileStore.profile?.email).toBe('root@root.it');
    });

    it('lists products and supports pagination', async () => {
        const productsStore = useProductsStore();
        await productsStore.fetchPaginationProducts(1, 2, true);
        expect(productsStore.pageItemList.length).toBe(2);
        expect(productsStore.pageTotal).toBeGreaterThan(0);
    });

    it('supports cart + checkout flow', async () => {
        const profileStore = useProfileStore();
        const cartStore = useCartStore();
        const ordersStore = useOrdersStore();

        await profileStore.login('root@root.it', 'RootRoot_123');
        await cartStore.fetchCart();
        const beforeCount = cartStore.cartItems.length;

        await cartStore.upsertCartItem('product-3', 2);
        expect(cartStore.cartItems.length).toBeGreaterThanOrEqual(beforeCount);
        expect(cartStore.cartSummary?.total).toBeGreaterThan(0);

        const checkoutResponse = await ordersStore.checkout();
        expect(checkoutResponse?.data?.order?.id).toBeTruthy();

        await cartStore.fetchCart();
        expect(cartStore.cartItems.length).toBe(0);
    });

    it('allows admin to read users list', async () => {
        const profileStore = useProfileStore();
        const usersStore = useUsersStore();
        await profileStore.login('root@root.it', 'RootRoot_123');
        await usersStore.fetchPaginationUsers(1, 10, true);
        expect(usersStore.pageItemList.length).toBeGreaterThan(0);
        expect(usersStore.pageItemList[0]?.email).toBeTruthy();
    });
});
